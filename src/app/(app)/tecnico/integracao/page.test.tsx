// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

import IntegracaoTecnicoPage from './page'

function job(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'job_1',
    legacyOrderNumber: '70435',
    status: 'FAILED',
    attemptCount: 3,
    errorCode: 'CONNECTOR_TIMEOUT',
    errorMessage: 'Conector não respondeu',
    createdAt: '2026-10-07T12:00:00.000Z',
    updatedAt: '2026-10-07T12:00:00.000Z',
    completedAt: '2026-10-07T12:00:00.000Z',
    ...overrides,
  }
}

const EVENTOS = [
  { id: 'evt_1', type: 'DISPATCHED', detail: null, createdAt: '2026-10-07T12:00:00.000Z' },
  {
    id: 'evt_2',
    type: 'RETRY',
    detail: 'CONNECTOR_TIMEOUT (tentativa 1/3)',
    createdAt: '2026-10-07T12:00:01.000Z',
  },
]

function configurarApi(jobs: unknown[], eventos: unknown[] = EVENTOS) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/integracao/jobs') return Promise.resolve({ jobs })
    if (url.startsWith('/api/integracao/pedidos/')) return Promise.resolve({ events: eventos })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(cleanup)

describe('IntegracaoTecnicoPage', () => {
  it('mostra carregando enquanto busca os jobs (LAC-09)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<IntegracaoTecnicoPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista os jobs com status e erros (LAC-09)', async () => {
    configurarApi([job()])
    render(<IntegracaoTecnicoPage />)

    expect(await screen.findByText('Pedido 70435')).toBeInTheDocument()
    expect(screen.getByText('Falhou')).toBeInTheDocument()
    expect(screen.getByText(/Erro: CONNECTOR_TIMEOUT/)).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/integracao/jobs')
  })

  it('mostra o estado vazio quando não há jobs (edge case)', async () => {
    configurarApi([])
    render(<IntegracaoTecnicoPage />)

    expect(await screen.findByText('Sem jobs de integração')).toBeInTheDocument()
  })

  it('mostra os eventos do job selecionado (LAC-10)', async () => {
    configurarApi([job()])
    render(<IntegracaoTecnicoPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Pedido 70435/ }))

    expect(await screen.findByText('DISPATCHED')).toBeInTheDocument()
    expect(screen.getByText('RETRY')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/integracao/pedidos/job_1')
  })

  it('mostra erro acessível e permite tentar de novo ao falhar a lista (LAC-09)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<IntegracaoTecnicoPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os jobs/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('mostra erro ao falhar o carregamento dos eventos (LAC-10)', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/integracao/jobs') return Promise.resolve({ jobs: [job()] })
      return Promise.reject(new Error('falha'))
    })
    render(<IntegracaoTecnicoPage />)

    fireEvent.click(await screen.findByRole('button', { name: /Pedido 70435/ }))

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/não foi possível carregar os eventos/i),
    )
  })

  it('usa o cabeçalho de página da integração (LAC-09)', async () => {
    configurarApi([job()])
    render(<IntegracaoTecnicoPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Integração' })).toBeInTheDocument()
  })
})
