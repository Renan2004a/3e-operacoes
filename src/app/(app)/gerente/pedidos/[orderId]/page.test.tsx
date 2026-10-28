// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  retorno: null as string | null,
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
  useSearchParams: () =>
    new URLSearchParams(mocks.retorno === null ? {} : { retorno: mocks.retorno }),
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

function pedido(
  classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION' = 'PENDING_CLASSIFICATION',
) {
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
        deadlineAt: null as string | null,
        activityDeadlineAt: null as string | null,
        classificationStatus,
      },
    ],
    totaisPorUnidade: [
      {
        unidade: 'peca',
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

function configurarApi(pedidoData = pedido()) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
    return Promise.resolve({ pedido: pedidoData })
  })
}

beforeEach(() => {
  mocks.retorno = null
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

  it('mantém a listagem padrão do gerente quando não há contexto de retorno', async () => {
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByRole('link', { name: /voltar para os pedidos/i })).toHaveAttribute(
      'href',
      '/gerente/pedidos',
    )
  })

  it('volta à listagem preservando filtros e página (PR #7)', async () => {
    mocks.retorno = '/gerente/pedidos?cliente=Ana&pagina=2'
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByRole('link', { name: /voltar para os pedidos/i })).toHaveAttribute(
      'href',
      '/gerente/pedidos?cliente=Ana&pagina=2',
    )
  })

  it('mostra os cinco valores por item (FEP-04)', async () => {
    configurarApi()
    render(<PedidoGerentePage />)

    const valores = await screen.findByLabelText('Valores do item 1')
    expect(within(valores).getByText('Solicitado')).toBeInTheDocument()
    expect(within(valores).getByText('10')).toBeInTheDocument()
    expect(within(valores).getByText('Executado')).toBeInTheDocument()
    expect(within(valores).getByText('8')).toBeInTheDocument()
    expect(within(valores).getByText('Disponível')).toBeInTheDocument()
    expect(within(valores).getByText('5')).toBeInTheDocument()
    expect(within(valores).getByText('Entregue')).toBeInTheDocument()
    expect(within(valores).getByText('3')).toBeInTheDocument()
    expect(within(valores).getByText('Pendente')).toBeInTheDocument()
    expect(within(valores).getByText('2')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos/p1')
  })

  it('mostra o desmembramento por setor e o setor do item', async () => {
    const comSetor = {
      ...pedido(),
      itens: [{ ...pedido().itens[0], sectorName: 'Telhas', activityStatus: 'IN_PROGRESS' }],
    }
    configurarApi(comSetor)
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Resumo do pedido')).toBeInTheDocument()
    expect(screen.getAllByText('Telhas').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/1 item\(ns\).*solicitado 10.*pendente de produção 2/),
    ).toBeInTheDocument()
  })

  it('mostra os totais por unidade sem somar peças com metros (RN01, RN02)', async () => {
    const misto = {
      ...pedido(),
      itens: [
        pedido().itens[0],
        {
          ...pedido().itens[0],
          itemId: 'item_2',
          unit: 'm',
          solicitado: '6',
          executado: '1',
          disponivel: '1',
          entregue: '0',
          pendente: '5',
        },
      ],
      totaisPorUnidade: [
        {
          unidade: 'peca',
          itens: 1,
          solicitado: '10',
          executado: '8',
          disponivel: '5',
          entregue: '3',
          pendente: '2',
        },
        {
          unidade: 'm',
          itens: 1,
          solicitado: '6',
          executado: '1',
          disponivel: '1',
          entregue: '0',
          pendente: '5',
        },
      ],
    }
    configurarApi(misto)
    render(<PedidoGerentePage />)

    expect(await screen.findByText('2 peca · 5,00 m')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Execução do pedido (peca)' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Execução do pedido (m)' })).toBeInTheDocument()
    expect(screen.queryByText('7')).not.toBeInTheDocument()
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
    mocks.apiPatch.mockResolvedValue({
      item: { id: 'item_1', deadlineAt: '2026-02-02T02:59:59.999Z' },
    })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Prazo de entrega (item 1)'), {
      target: { value: '2026-02-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo de entrega (item 1)' }))

    await waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/pedidos/itens/item_1/prazo', {
        prazo: '2026-02-01',
      }),
    )
  })

  it('reflete o prazo persistido devolvido pela API após salvar (FEP-05, AD-009)', async () => {
    configurarApi()
    mocks.apiPatch.mockResolvedValue({
      item: { id: 'item_1', deadlineAt: '2026-02-02T02:59:59.999Z' },
    })
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Prazo de entrega (item 1)'), {
      target: { value: '2026-02-01' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo de entrega (item 1)' }))

    expect(await screen.findByText('Prazo de entrega: 01/02/2026')).toBeInTheDocument()
  })

  it('exibe o prazo já persistido ao carregar a página (AD-009)', async () => {
    configurarApi({
      ...pedido(),
      itens: [{ ...pedido().itens[0], deadlineAt: '2026-02-02T02:59:59.999Z' }],
    })
    render(<PedidoGerentePage />)

    expect(await screen.findByLabelText('Prazo de entrega (item 1)')).toHaveValue('2026-02-01')
    expect(screen.getByText('Prazo de entrega: 01/02/2026')).toBeInTheDocument()
  })

  it('exibe “Sem prazo” quando o item não tem prazo (AD-009)', async () => {
    configurarApi()
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Sem prazo')).toBeInTheDocument()
    expect(screen.getByLabelText('Prazo de entrega (item 1)')).toHaveValue('')
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
    expect(screen.getByText('Unidade')).toBeInTheDocument()
    expect(screen.getAllByText('peca').length).toBeGreaterThan(0)
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

  it('aceita o setor sugerido sem alterar o seletor (LAC-04)', async () => {
    const comSugestao = {
      ...pedido(),
      itens: [{ ...pedido().itens[0], suggestedSectorId: 'setor_telhas' }],
    }
    configurarApi(comSugestao)
    mocks.apiPost.mockResolvedValue({
      status: 'CLASSIFIED',
      sectorId: 'setor_telhas',
      activityId: 'act_1',
    })
    render(<PedidoGerentePage />)

    const seletor = await screen.findByLabelText('Setor do item 1')
    expect(seletor).toHaveValue('setor_telhas')

    fireEvent.click(screen.getByRole('button', { name: 'Classificar item 1' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/classificar', {
        sectorId: 'setor_telhas',
      }),
    )
    expect(await screen.findByText('Item desmembrado')).toBeInTheDocument()
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

    expect(await screen.findByText('Item desmembrado')).toBeInTheDocument()
  })

  it('indica o item já classificado e não oferece classificar de novo (LAC-05)', async () => {
    configurarApi(pedido('CLASSIFIED'))
    render(<PedidoGerentePage />)

    expect(await screen.findByText('Item desmembrado')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Classificar item 1' })).not.toBeInTheDocument()
  })

  it('marca como classificado quando a API responde 409 (LAC-05)', async () => {
    configurarApi()
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(409, 'item_already_classified'))
    render(<PedidoGerentePage />)

    fireEvent.change(await screen.findByLabelText('Setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Classificar item 1' }))

    expect(await screen.findByText('Item desmembrado')).toBeInTheDocument()
  })
})
