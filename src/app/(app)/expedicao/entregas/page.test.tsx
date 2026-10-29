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
    totaisPorUnidade: [
      {
        unidade: 'un',
        itens: 1,
        solicitado: '10',
        executado: '8',
        disponivel: String(disponivel),
        entregue: String(8 - disponivel),
        pendente: '2',
      },
    ],
  }
}

function configurarApi(
  detalhes: ReturnType<typeof detalhe>[],
  papel: 'PRODUCTION_MANAGER' | 'SHIPPING' = 'PRODUCTION_MANAGER',
) {
  let chamadas = 0
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/auth/sessao') {
      return Promise.resolve({ usuario: { roles: [papel] } })
    }
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

  it('entrega dentro do disponível pede confirmação, registra e atualiza o saldo (FEP-06)', async () => {
    configurarApi([detalhe(5), detalhe(2)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    expect(mocks.apiPost).not.toHaveBeenCalled()
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas', {
        quantidade: '3',
        excecao: false,
        motivoExcecao: undefined,
      }),
    )
    expect(await screen.findByText('Disponível: 2')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('a confirmação resume o item, a quantidade e o que sobra, entrega parcial (EXP-08)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    const dialogo = await screen.findByRole('dialog', { name: 'Confirmar a entrega?' })
    expect(dialogo).toHaveTextContent('Você vai entregar 3 do item 1.')
    expect(dialogo).toHaveTextContent('Disponível agora: 5')
    expect(dialogo).toHaveTextContent('Depois da entrega sobram 2 disponíveis.')
    expect(dialogo).toHaveTextContent('O item continua com entrega parcial.')
    expect(dialogo).toHaveTextContent('Não é possível desfazer')
  })

  it('a confirmação avisa quando a entrega conclui o item (EXP-09)', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '5' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('Esta entrega conclui o item.')
  })

  it('cancelar a confirmação não registra e mantém o valor digitado', async () => {
    configurarApi([detalhe(5)])
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancelar' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mocks.apiPost).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Quantidade do item 1')).toHaveValue(3)
  })

  it('falha no registro fecha a confirmação e mostra o erro no formulário', async () => {
    configurarApi([detalhe(5)])
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(500, 'erro'))
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '3' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar entrega' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível registrar/i)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('bloqueia entrega acima do disponível sem autorização de gerente (FEP-07)', async () => {
    configurarApi([detalhe(5)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: '9' },
    })

    expect(await screen.findByText(/Peça ao gerente de produção/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Autorizar acima do disponível')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))
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

  it('exceção autorizada com motivo só envia depois da confirmação reforçada (FEP-07)', async () => {
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

    const dialogo = await screen.findByRole('dialog', {
      name: 'Confirmar entrega acima do disponível?',
    })
    expect(dialogo).toHaveTextContent('9 do item 1')
    expect(dialogo).toHaveTextContent('4 acima do disponível (5)')
    expect(dialogo).toHaveTextContent('Motivo: Cliente pediu urgente')
    expect(dialogo).toHaveTextContent('ficará registrada na auditoria')
    expect(mocks.apiPost).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas', {
        quantidade: '9',
        excecao: true,
        motivoExcecao: 'Cliente pediu urgente',
      }),
    )
  })

  it('mostra erro acessível e permite tentar de novo quando a API falha (FEP-13)', async () => {
    let primeiraLista = true
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/auth/sessao') return Promise.resolve({ usuario: { roles: ['SHIPPING'] } })
      if (url === '/api/pedidos') {
        if (primeiraLista) {
          primeiraLista = false
          return Promise.reject(new Error('falha'))
        }
        return Promise.resolve({ pedidos: [] })
      }
      return Promise.reject(new Error(`url inesperada: ${url}`))
    })
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

  it('resume disponíveis e pendentes por unidade, sem somar unidades diferentes (RN02)', async () => {
    const base = detalhe(5)
    configurarApi([
      {
        ...base,
        itens: [
          ...base.itens,
          { ...base.itens[0], itemId: 'item_2', solicitado: '4', executado: '4', disponivel: '4', entregue: '0', pendente: '0' },
        ],
        totaisPorUnidade: [
          { unidade: 'un', itens: 1, solicitado: '10', executado: '8', disponivel: '5', entregue: '3', pendente: '2' },
          { unidade: 'm', itens: 1, solicitado: '4', executado: '4', disponivel: '4', entregue: '0', pendente: '0' },
        ],
      },
    ])
    render(<EntregasPage />)

    await selecionarPedido()

    const disponiveis = (await screen.findByText('Disponíveis')).closest('div.rounded-card')
    expect(disponiveis).toHaveTextContent('5 un · 4,00 m')
    expect(screen.getByText('Pendentes').closest('div.rounded-card')).toHaveTextContent('2 un · 0,00 m')
  })
})
