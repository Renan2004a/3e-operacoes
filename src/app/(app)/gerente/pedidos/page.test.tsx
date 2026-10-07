// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), push: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useParams: () => ({}),
}))

import PedidosGerentePage from './page'

const PEDIDO = { id: 'p1', numero: '100', cliente: 'Ana', status: 'PENDING' as const }

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.push.mockReset()
})

afterEach(cleanup)

describe('PedidosGerentePage', () => {
  it('renderiza o cabeçalho e a lista de pedidos (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue({ pedidos: [PEDIDO] })
    render(<PedidosGerentePage />)

    expect(screen.getByRole('heading', { name: 'Pedidos' })).toBeInTheDocument()
    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
  })

  it('ao selecionar um pedido navega para o detalhe (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue({ pedidos: [PEDIDO] })
    render(<PedidosGerentePage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(mocks.push).toHaveBeenCalledWith('/gerente/pedidos/p1')
  })

  it('mostra o estado de carregando enquanto busca (FEP-03)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<PedidosGerentePage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('mostra erro acessível e permite tentar de novo (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<PedidosGerentePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os pedidos/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há pedidos (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue({ pedidos: [] })
    render(<PedidosGerentePage />)

    expect(await screen.findByText('Sem pedidos')).toBeInTheDocument()
  })
})
