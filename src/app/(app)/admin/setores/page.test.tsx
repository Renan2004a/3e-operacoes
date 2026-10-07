// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message?: string) {
      super(message ?? code)
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: mocks.apiPatch,
  ApiError: mocks.ApiError,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}))

import SetoresPage from './page'

const CORTE = { id: 's1', code: 'CORTE', name: 'Corte e Dobra', active: true }
const TELHAS = { id: 's2', code: 'TELHA', name: 'Telhas', active: true }

function configurarApi(responderMapeamento: () => Promise<unknown>) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/setores') return Promise.resolve({ sectors: [CORTE, TELHAS] })
    if (url.startsWith('/api/mapeamentos?')) return responderMapeamento()
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
  mocks.apiPatch.mockReset()
})

afterEach(cleanup)

describe('SetoresPage', () => {
  it('mostra o estado de carregando enquanto busca os setores (FEP-09)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<SetoresPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista os setores cadastrados (FEP-09)', async () => {
    configurarApi(() => Promise.resolve({}))
    render(<SetoresPage />)

    const lista = await screen.findByRole('list', { name: 'Setores' })
    expect(within(lista).getByText('CORTE: Corte e Dobra')).toBeInTheDocument()
    expect(within(lista).getByText('TELHA: Telhas')).toBeInTheDocument()
  })

  it('cria um setor (FEP-09)', async () => {
    configurarApi(() => Promise.resolve({}))
    mocks.apiPost.mockResolvedValue({ sector: CORTE })
    render(<SetoresPage />)

    fireEvent.change(await screen.findByLabelText('Código'), { target: { value: 'REVENDA' } })
    fireEvent.change(screen.getByLabelText('Nome do setor'), { target: { value: 'Revenda' } })
    fireEvent.click(screen.getByRole('button', { name: 'Criar setor' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/setores', {
        code: 'REVENDA',
        name: 'Revenda',
      }),
    )
  })

  it('cria o mapeamento quando a categoria não tem setor (FEP-09)', async () => {
    configurarApi(() => Promise.reject(new mocks.ApiError(404, 'mapping_not_found')))
    mocks.apiPost.mockResolvedValue({ mapping: {} })
    render(<SetoresPage />)

    fireEvent.change(await screen.findByLabelText('Categoria'), { target: { value: 'Nova' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar mapeamento' }))
    expect(await screen.findByText('Sem mapeamento para esta categoria.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 's1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar mapeamento' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/mapeamentos', {
        legacyCategory: 'Nova',
        sectorId: 's1',
      }),
    )
  })

  it('altera o setor de um mapeamento existente (FEP-09)', async () => {
    configurarApi(() =>
      Promise.resolve({
        mapping: { id: 'm1', legacyCategory: 'Telha', sectorId: 's1', status: 'ACTIVE' },
      }),
    )
    mocks.apiPatch.mockResolvedValue({ mapping: {} })
    render(<SetoresPage />)

    fireEvent.change(await screen.findByLabelText('Categoria'), { target: { value: 'Telha' } })
    fireEvent.click(screen.getByRole('button', { name: 'Buscar mapeamento' }))
    expect(await screen.findByText('Mapeado para Corte e Dobra.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 's2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar mapeamento' }))

    await waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/mapeamentos', {
        id: 'm1',
        sectorId: 's2',
      }),
    )
  })

  it('mostra erro acessível e permite tentar de novo quando a API falha (FEP-13)', async () => {
    mocks.apiGet
      .mockRejectedValueOnce(new Error('falha'))
      .mockResolvedValueOnce({ sectors: [CORTE] })
    render(<SetoresPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os setores/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('heading', { name: 'Setores e mapeamentos' })).toBeInTheDocument()
  })
})
