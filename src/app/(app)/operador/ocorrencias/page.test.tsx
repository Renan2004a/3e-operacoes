// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import OcorrenciasPage from './page'

const ATIVIDADE = {
  id: 'atv_1',
  status: 'PENDING' as const,
  orderNumber: '82269',
  itemDescription: 'Perfil UE',
  productCode: 'PRD-1',
  sectorName: 'Corte e Dobra',
}

const MOTIVO = {
  id: 'm1',
  tipo: 'PERDA' as const,
  codigo: 'DEFEITO_CORTE',
  descricao: 'Defeito de corte',
  ativo: true,
}

const OCORRENCIA = {
  id: 'o1',
  activityId: 'atv_1',
  tipo: 'PERDA' as const,
  quantidade: '2',
  observacao: 'Peça trincada',
  occurredAt: '2026-10-25T12:00:00.000Z',
  motivo: 'Defeito de corte',
  pedido: '82269',
  item: 'Perfil UE',
  setor: 'Corte e Dobra',
  usuario: 'Operador',
  activityStatus: 'PENDING' as const,
}

function configurarApi(opcoes: { atividades?: unknown[]; ocorrencias?: unknown[] } = {}) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/producao/atividades') {
      return Promise.resolve({ atividades: opcoes.atividades ?? [ATIVIDADE] })
    }
    if (url === '/api/producao/ocorrencias') {
      return Promise.resolve({ ocorrencias: opcoes.ocorrencias ?? [OCORRENCIA] })
    }
    if (url.startsWith('/api/motivos')) {
      return Promise.resolve({ motivos: [MOTIVO] })
    }
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
  window.history.replaceState({}, '', '/operador/ocorrencias')
})

afterEach(cleanup)

describe('OcorrenciasPage', () => {
  it('mostra o estado de carregando enquanto busca', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<OcorrenciasPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista as ocorrências do operador com pedido, motivo e responsável (OCO-07)', async () => {
    configurarApi()
    render(<OcorrenciasPage />)

    expect(await screen.findByText('Pedido 82269 · Perfil UE')).toBeInTheDocument()
    expect(screen.getByText(/Defeito de corte/)).toBeInTheDocument()
    expect(screen.getByText(/Registrado por Operador/)).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/producao/ocorrencias')
  })

  it('mostra estado vazio quando não há ocorrências', async () => {
    configurarApi({ ocorrencias: [] })
    render(<OcorrenciasPage />)

    expect(await screen.findByText('Nenhuma ocorrência registrada')).toBeInTheDocument()
  })

  it('avisa quando não há atividades para registrar', async () => {
    configurarApi({ atividades: [] })
    render(<OcorrenciasPage />)

    expect(await screen.findByText('Nenhuma atividade disponível')).toBeInTheDocument()
  })

  it('pré-seleciona a atividade vinda da URL', async () => {
    window.history.replaceState({}, '', '/operador/ocorrencias?atividade=atv_1')
    configurarApi()
    render(<OcorrenciasPage />)

    expect(await screen.findByLabelText('Atividade')).toHaveValue('atv_1')
    expect(await screen.findByLabelText('Tipo de ocorrência')).toBeInTheDocument()
  })

  it('registra a ocorrência e mostra sucesso', async () => {
    configurarApi()
    mocks.apiPost.mockResolvedValue({ ocorrencia: { id: 'o2' } })
    render(<OcorrenciasPage />)

    fireEvent.change(await screen.findByLabelText('Atividade'), {
      target: { value: 'atv_1' },
    })
    fireEvent.change(await screen.findByLabelText('Motivo'), {
      target: { value: 'm1' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/producao/atividades/atv_1/ocorrencias', {
        tipo: 'PERDA',
        motivoId: 'm1',
        quantidade: undefined,
        observacao: undefined,
      }),
    )
    expect(await screen.findByText('Ocorrência registrada')).toBeInTheDocument()
  })

  it('mantém os dados preenchidos quando o registro falha', async () => {
    configurarApi()
    mocks.apiPost.mockRejectedValue(new Error('falha'))
    render(<OcorrenciasPage />)

    fireEvent.change(await screen.findByLabelText('Atividade'), {
      target: { value: 'atv_1' },
    })
    const motivo = await screen.findByLabelText('Motivo')
    fireEvent.change(motivo, { target: { value: 'm1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível registrar/i)
    expect(screen.getByLabelText('Motivo')).toHaveValue('m1')
  })

  it('mostra erro acessível e permite tentar de novo quando a carga falha', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<OcorrenciasPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar as ocorrências/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
