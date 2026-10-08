// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
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
  apiPatch: vi.fn(),
  ApiError: mocks.ApiError,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}))

import EntregasPage from './page'

function detalhe(disponivel: number) {
  return {
    id: 'p1',
    numero: '100',
    cliente: 'Ana',
    itens: [
      {
        itemId: 'item_1',
        solicitado: '10',
        executado: '8',
        disponivel: String(disponivel),
        entregue: String(8 - disponivel),
        pendente: '2',
      },
    ],
  }
}

function configurarApi(detalhes: ReturnType<typeof detalhe>[]) {
  let chamadas = 0
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/pedidos') {
      return Promise.resolve({ pedidos: [{ id: 'p1', numero: '100', cliente: 'Ana' }] })
    }
    if (url === '/api/pedidos/p1') {
      const resposta = detalhes[Math.min(chamadas, detalhes.length - 1)]
      chamadas += 1
      return Promise.resolve({ pedido: resposta })
    }
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

async function selecionarPedido() {
  fireEvent.change(await screen.findByLabelText('Pedido'), { target: { value: 'p1' } })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

describe('EntregasPage', () => {
  it('mostra o estado de carregando enquanto busca os pedidos (FEP-06)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<EntregasPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('mostra os itens disponíveis do pedido (FEP-06)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findByText('Disponível: 5')).toBeInTheDocument()
  })

  it('entrega dentro do disponível registra e atualiza o saldo (FEP-06)', async () => {
    configurarApi([detalhe(5), detalhe(2)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas', {
        quantidade: '3',
        excecao: false,
        motivoExcecao: undefined,
      }),
    )
    expect(await screen.findByText('Disponível: 2')).toBeInTheDocument()
  })

  it('bloqueia entrega acima do disponível sem autorização de gerente (FEP-07)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '9' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /autorização de gerente com motivo/i,
    )
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('bloqueia a exceção sem motivo (FEP-07)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '9' },
    })
    fireEvent.click(await screen.findByLabelText('Autorizar acima do disponível'))
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/informe o motivo/i)
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('exceção autorizada com motivo envia a entrega com o motivo (FEP-07)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '9' },
    })
    fireEvent.click(await screen.findByLabelText('Autorizar acima do disponível'))
    fireEvent.change(screen.getByLabelText('Motivo da exceção do item 1'), {
      target: { value: 'Cliente pediu urgente' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas', {
        quantidade: '9',
        excecao: true,
        motivoExcecao: 'Cliente pediu urgente',
      }),
    )
  })

  it('mostra erro acessível e permite tentar de novo quando a API falha (FEP-13)', async () => {
    mocks.apiGet
      .mockRejectedValueOnce(new Error('falha'))
      .mockResolvedValueOnce({ pedidos: [] })
    render(<EntregasPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os pedidos/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByLabelText('Pedido')).toBeInTheDocument()
  })

  it('usa o cabeçalho de página com o título (VIS-09)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Entregas' })).toBeInTheDocument()
  })

  it('resume o pedido selecionado em métricas (PROT-05)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findByText('Disponíveis')).toBeInTheDocument()
    expect(screen.getByText('Disponíveis').closest('div.rounded-card')).toHaveTextContent('5')
    expect(screen.getByText('Pendentes')).toBeInTheDocument()
  })
})
