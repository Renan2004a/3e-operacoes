// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  apiDelete: vi.fn(),
}))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: mocks.apiPatch,
  apiDelete: mocks.apiDelete,
  ApiError: class ApiError extends Error {
    status = 0
  },
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ orderId: 'p1' }),
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

import PedidoVendedorPage from './page'

const SETORES = [
  { id: 'setor_telhas', code: 'TELHAS', name: 'Telhas', active: true },
  { id: 'setor_corte', code: 'CORTE_DOBRA', name: 'Corte e Dobra', active: true },
]

function detalhe() {
  return {
    id: 'p1',
    numero: '100',
    cliente: 'Ana',
    customerName: 'Ana',
    sellerLegacyCode: 'V1',
    itens: [
      {
        itemId: 'item_1',
        solicitado: '10',
        executado: '8',
        disponivel: '5',
        entregue: '3',
        pendente: '2',
        description: 'Telha',
        productCode: '470',
        unit: 'm',
        classificationStatus: 'PENDING_CLASSIFICATION',
        sectorCode: null,
        sectorName: null,
        activityStatus: null,
        suggestedSectorId: 'setor_telhas',
        remessas: [],
      },
    ],
    totaisPorUnidade: [
      {
        unidade: 'm',
        itens: 1,
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
    if (url === '/api/pedidos/p1') return Promise.resolve({ pedido: detalhe() })
    if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
  mocks.apiPatch.mockReset()
  mocks.apiDelete.mockReset()
})

afterEach(cleanup)

describe('PedidoVendedorPage', () => {
  it('carrega o detalhe e oferece o retorno para a lista', async () => {
    configurarApi()
    render(<PedidoVendedorPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido 100' })).toBeInTheDocument()
    const voltar = screen.getByRole('link', { name: /voltar para os pedidos/i })
    expect(voltar).toHaveAttribute('href', '/vendedor/pedidos')
  })

  it('mostra quantidades, prazo e as ações de desmembramento e remessa na ordem esperada', async () => {
    configurarApi()
    render(<PedidoVendedorPage />)

    expect(await screen.findByText('Solicitado')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByLabelText('Prazo do item 1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Classificar item 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar remessa do item 1' })).toBeInTheDocument()
  })

  it('desmembra o item e confirma o resultado', async () => {
    configurarApi()
    mocks.apiPost.mockResolvedValue({})
    render(<PedidoVendedorPage />)

    fireEvent.change(await screen.findByLabelText('Setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Classificar item 1' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/classificar', {
        sectorId: 'setor_telhas',
      }),
    )
    expect(await screen.findByText('Item desmembrado com sucesso.')).toBeInTheDocument()
  })

  it('programa uma remessa pelo botão + e mostra o sucesso', async () => {
    configurarApi()
    mocks.apiPost.mockResolvedValue({
      remessa: { id: 'r1', remessa: 1, scheduledAt: '2026-12-15T15:00:00.000Z', confirmedAt: null },
    })
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Adicionar remessa do item 1' }))
    fireEvent.change(screen.getByLabelText('Remessa (item 1)'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('Data prevista (item 1)'), {
      target: { value: '2026-12-15' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Programar remessa do item 1' }))

    expect(await screen.findByText('Remessa criada com sucesso.')).toBeInTheDocument()
  })

  it('mostra erro acessível quando o detalhe não carrega', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<PedidoVendedorPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar o pedido/i)
  })
})
