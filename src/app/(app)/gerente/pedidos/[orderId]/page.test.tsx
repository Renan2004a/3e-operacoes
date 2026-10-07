// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
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
  apiPost: vi.fn(),
  apiPatch: mocks.apiPatch,
  ApiError: mocks.ApiError,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'p1' }),
  useRouter: () => ({ push: vi.fn() }),
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

import PedidoGerentePage from './page'

function pedido() {
  return {
    id: 'p1',
    numero: '100',
    cliente: 'Ana',
    itens: [
      {
        itemId: 'item_1',
        solicitado: '10',
        executado: '8',
        disponivel: '5',
        entregue: '3',
        pendente: '2',
      },
    ],
  }
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPatch.mockReset()
})

afterEach(cleanup)

describe('PedidoGerentePage', () => {
  it('mostra o estado de carregando enquanto busca o pedido (FEP-04)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<PedidoGerentePage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('mostra os cinco valores por item (FEP-04)', async () => {
    mocks.apiGet.mockResolvedValue({ pedido: pedido() })
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Solicitado: 10')).toBeInTheDocument()
    expect(screen.getByText('Executado: 8')).toBeInTheDocument()
    expect(screen.getByText('Disponível: 5')).toBeInTheDocument()
    expect(screen.getByText('Entregue: 3')).toBeInTheDocument()
    expect(screen.getByText('Pendente: 2')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos/p1')
  })

  it('mostra erro acessível e permite tentar de novo (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<PedidoGerentePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar o pedido/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('define o prazo do item e envia a data para a API (FEP-05)', async () => {
    mocks.apiGet.mockResolvedValue({ pedido: pedido() })
    mocks.apiPatch.mockResolvedValue({ item: { id: 'item_1', deadlineAt: '2026-02-01T00:00:00.000Z' } })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Prazo do item item_1'), {
      target: { value: '2026-02-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo do item item_1' }))

    await waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/pedidos/itens/item_1/prazo', {
        prazo: '2026-02-01',
      }),
    )
  })

  it('reflete o status de prazo após salvar (FEP-05)', async () => {
    mocks.apiGet.mockResolvedValue({ pedido: pedido() })
    mocks.apiPatch.mockResolvedValue({ item: { id: 'item_1', deadlineAt: '2026-02-01T00:00:00.000Z' } })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Prazo do item item_1'), {
      target: { value: '2026-02-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo do item item_1' }))

    expect(await screen.findByText('Prazo definido: 2026-02-01')).toBeInTheDocument()
  })

  it('mostra pedido não encontrado quando a API responde 404 (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValue(new mocks.ApiError(404, 'order_not_found'))
    render(<PedidoGerentePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/pedido não encontrado/i)
  })
})
