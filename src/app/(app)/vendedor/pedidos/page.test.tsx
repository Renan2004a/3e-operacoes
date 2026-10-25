// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
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
  useParams: () => ({}),
  useRouter: () => ({ push: mocks.push }),
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

function configurarApi() {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url.startsWith('/api/pedidos')) return Promise.resolve({ pedidos: [PEDIDO] })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

beforeEach(() => {
  window.history.replaceState({}, '', '/')
  mocks.apiGet.mockReset()
  mocks.push.mockReset()
})

afterEach(cleanup)

describe('VendedorPedidosPage', () => {
  it('lista os pedidos para consulta (FEP-03)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos')
  })

  it('permite puxar o pedido do Top Gerente (vendedor importa)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByText('Puxar pedido do Top Gerente')).toBeInTheDocument()
    expect(screen.getByLabelText('Número do pedido')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Importar pedido' })).toBeInTheDocument()
  })

  it('ao abrir um pedido navega para o detalhe com o contexto da listagem (FEP-04)', async () => {
    window.history.replaceState({}, '', '/vendedor/pedidos?cliente=Ana&pagina=2')
    configurarApi()
    render(<VendedorPedidosPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(mocks.push).toHaveBeenCalledWith(
      '/vendedor/pedidos/p1?retorno=%2Fvendedor%2Fpedidos%3Fcliente%3DAna%26pagina%3D2',
    )
  })

  it('mostra a tabela com os filtros da consulta (PROT-06)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByRole('table', { name: 'Pedidos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filtrar' })).toBeInTheDocument()
  })

  it('usa o cabeçalho de página com o título (VIS-09)', async () => {
    configurarApi()
    render(<VendedorPedidosPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Vendas' })).toBeInTheDocument()
  })
})
