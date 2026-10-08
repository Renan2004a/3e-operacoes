// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPatch: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: mocks.apiPatch,
  ApiError: class ApiError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({}),
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

import VendedorPedidosPage from './page'

const PEDIDO = { id: 'p1', numero: '100', cliente: 'Ana', status: 'PENDING' as const }

function detalhe() {
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

function configurarApi() {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/pedidos') return Promise.resolve({ pedidos: [PEDIDO] })
    if (url === '/api/pedidos/p1') return Promise.resolve({ pedido: detalhe() })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPatch.mockReset()
})

afterEach(cleanup)

describe('VendedorPedidosPage', () => {
  it('lista os pedidos para consulta (FEP-03)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos')
  })

  it('ao selecionar um pedido mostra o detalhe com os cinco valores (FEP-04)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(await screen.findByText('Solicitado: 10')).toBeInTheDocument()
    expect(screen.getByText('Executado: 8')).toBeInTheDocument()
    expect(screen.getByText('Disponível: 5')).toBeInTheDocument()
    expect(screen.getByText('Entregue: 3')).toBeInTheDocument()
    expect(screen.getByText('Pendente: 2')).toBeInTheDocument()
  })

  it('permite definir o prazo do item (FEP-05)', async () => {
    configurarApi()
    mocks.apiPatch.mockResolvedValue({ item: { id: 'item_1', deadlineAt: '2026-02-01T00:00:00.000Z' } })
    render(<VendedorPedidosPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))
    fireEvent.change(await screen.findByLabelText('Prazo do item 1'), {
      target: { value: '2026-02-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo do item 1' }))

    await waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/pedidos/itens/item_1/prazo', {
        prazo: '2026-02-01',
      }),
    )
  })

  it('não expõe ações de produção: somente leitura além do prazo (FEP-04)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(await screen.findByRole('button', { name: 'Salvar prazo do item 1' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /registrar execução/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /classificar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /prioridade/i })).not.toBeInTheDocument()
  })

  it('mostra erro acessível quando o detalhe não carrega (FEP-13)', async () => {
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/pedidos') return Promise.resolve({ pedidos: [PEDIDO] })
      return Promise.reject(new Error('falha'))
    })
    render(<VendedorPedidosPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar o pedido/i)
  })

  it('usa o cabeçalho de página com o título (VIS-09)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedidos' })).toBeInTheDocument()
  })

  it('mostra a tabela com os filtros da consulta (PROT-06)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByRole('table', { name: 'Pedidos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument()
  })
})
