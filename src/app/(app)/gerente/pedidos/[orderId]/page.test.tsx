// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

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

const SETORES = [
  { id: 'setor_telhas', code: 'TELHAS', name: 'Telhas', active: true },
  { id: 'setor_corte', code: 'CORTE_DOBRA', name: 'Corte e Dobra', active: true },
]

function pedido(classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION' = 'PENDING_CLASSIFICATION') {
  return {
    id: 'p1',
    numero: '100',
    cliente: 'Ana',
    customerName: 'Ana',
    sellerLegacyCode: 'V-77',
    itens: [
      {
        itemId: 'item_1',
        solicitado: '10',
        executado: '8',
        disponivel: '5',
        entregue: '3',
        pendente: '2',
        description: 'Chapa dobrada',
        productCode: 'PRD-77',
        unit: 'peca',
        classificationStatus,
      },
    ],
  }
}

function configurarApi(pedidoData = pedido()) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
    return Promise.resolve({ pedido: pedidoData })
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
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
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Solicitado: 10')).toBeInTheDocument()
    expect(screen.getByText('Executado: 8')).toBeInTheDocument()
    expect(screen.getByText('Disponível: 5')).toBeInTheDocument()
    expect(screen.getByText('Entregue: 3')).toBeInTheDocument()
    expect(screen.getByText('Pendente: 2')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos/p1')
  })

  it('mostra o desmembramento por setor e o setor do item', async () => {
    const comSetor = {
      ...pedido(),
      itens: [{ ...pedido().itens[0], sectorName: 'Telhas', activityStatus: 'IN_PROGRESS' }],
    }
    configurarApi(comSetor)
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Desmembramento por setor')).toBeInTheDocument()
    expect(screen.getAllByText('Telhas').length).toBeGreaterThan(0)
    expect(screen.getByText(/1 item\(ns\).*solicitado 10.*pendente 2/)).toBeInTheDocument()
  })

  it('mostra erro acessível e permite tentar de novo (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<PedidoGerentePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar o pedido/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('define o prazo do item e envia a data para a API (FEP-05)', async () => {
    configurarApi()
    mocks.apiPatch.mockResolvedValue({ item: { id: 'item_1', deadlineAt: '2026-02-01T00:00:00.000Z' } })
    render(<PedidoGerentePage />)

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

  it('reflete o status de prazo após salvar (FEP-05)', async () => {
    configurarApi()
    mocks.apiPatch.mockResolvedValue({ item: { id: 'item_1', deadlineAt: '2026-02-01T00:00:00.000Z' } })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Prazo do item 1'), {
      target: { value: '2026-02-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo do item 1' }))

    expect(await screen.findByText('Prazo definido: 2026-02-01')).toBeInTheDocument()
  })

  it('mostra pedido não encontrado quando a API responde 404 (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValue(new mocks.ApiError(404, 'order_not_found'))
    render(<PedidoGerentePage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/pedido não encontrado/i)
  })

  it('usa o cabeçalho de página com o número do pedido (VIS-09)', async () => {
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Pedido 100' })).toBeInTheDocument()
  })

  it('mostra descrição, código, unidade do item e vendedor do pedido (PROT-07)', async () => {
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Chapa dobrada')).toBeInTheDocument()
    expect(screen.getByText(/PRD-77/)).toBeInTheDocument()
    expect(screen.getByText('Unidade: peca')).toBeInTheDocument()
    expect(screen.getByText(/V-77/)).toBeInTheDocument()
  })

  it('carrega os setores da API para classificar (LAC-04)', async () => {
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByRole('option', { name: 'Telhas' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Corte e Dobra' })).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/setores')
  })

  it('permite classificar item pendente escolhendo o setor (LAC-04)', async () => {
    configurarApi()
    mocks.apiPost.mockResolvedValue({
      status: 'CLASSIFIED',
      sectorId: 'setor_telhas',
      activityId: 'act_1',
    })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Classificar item 1' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/classificar', {
        sectorId: 'setor_telhas',
      }),
    )
  })

  it('reflete o item classificado após a ação (LAC-06)', async () => {
    configurarApi()
    mocks.apiPost.mockResolvedValue({
      status: 'CLASSIFIED',
      sectorId: 'setor_telhas',
      activityId: 'act_1',
    })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Classificar item 1' }))

    expect(await screen.findByText('Item classificado')).toBeInTheDocument()
  })

  it('indica o item já classificado e não oferece classificar de novo (LAC-05)', async () => {
    configurarApi(pedido('CLASSIFIED'))
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Item classificado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Classificar item 1' }),
    ).not.toBeInTheDocument()
  })

  it('marca como classificado quando a API responde 409 (LAC-05)', async () => {
    configurarApi()
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(409, 'item_already_classified'))
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Classificar item 1' }))

    expect(await screen.findByText('Item classificado')).toBeInTheDocument()
  })
})
