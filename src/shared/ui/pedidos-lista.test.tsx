// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}))

import { PedidosLista } from './pedidos-lista'

const PEDIDO = { id: 'p1', numero: '100', cliente: 'Ana', status: 'PENDING' as const }

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(cleanup)

describe('PedidosLista', () => {
  it('mostra o estado de carregando enquanto busca (FEP-03)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista os pedidos com número, cliente e status textual (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue({ pedidos: [PEDIDO] })
    render(<PedidosLista onSelecionar={vi.fn()} />)

    const lista = await screen.findByRole('list', { name: 'Pedidos' })
    expect(within(lista).getByText('Pedido 100')).toBeInTheDocument()
    expect(within(lista).getByText('Ana')).toBeInTheDocument()
    expect(within(lista).getByText('Pendente')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos')
  })

  it('mostra estado vazio quando não há pedidos (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue({ pedidos: [] })
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(await screen.findByText('Sem pedidos')).toBeInTheDocument()
  })

  it('mostra erro acessível e tentar de novo recarrega (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce({ pedidos: [PEDIDO] })
    render(<PedidosLista onSelecionar={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os pedidos/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
  })

  it('aplica os filtros de cliente, setor, status e período na consulta (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue({ pedidos: [] })
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Sem pedidos')
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'setor-corte' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PENDING' } })
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-01-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenLastCalledWith(
        '/api/pedidos?cliente=Ana&setor=setor-corte&status=PENDING&de=2026-01-01&ate=2026-01-31',
      ),
    )
  })

  it('selecionar um pedido aciona o chamador com o pedido (FEP-03)', async () => {
    const onSelecionar = vi.fn()
    mocks.apiGet.mockResolvedValue({ pedidos: [PEDIDO] })
    render(<PedidosLista onSelecionar={onSelecionar} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(onSelecionar).toHaveBeenCalledWith(PEDIDO)
  })
})
