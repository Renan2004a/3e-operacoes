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
    if (url === '/api/pedidos/itens/item_1/entregas') {
      return Promise.resolve({
        entregas: [
          {
            id: 'e1',
            quantidade: '3',
            usuarioId: 'u1',
            usuarioNome: 'Paula Expedição',
            occurredAt: '2026-10-27T15:30:00.000Z',
            excecao: false,
          },
        ],
      })
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

  async function registrarComFalha(erro: Error, quantidade = '3') {
    mocks.apiPost.mockRejectedValue(erro)
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.change(await screen.findByLabelText('Quantidade do item 1'), {
      target: { value: quantidade },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar entrega' }))
    return screen.findByRole('alert')
  }

  it('quantidade inválida para a unidade explica a regra, não só "tente novamente" (H9)', async () => {
    configurarApi([detalhe(5)])
    const alerta = await registrarComFalha(new mocks.ApiError(400, 'invalid_quantity'))

    expect(alerta).toHaveTextContent(/quantidade não é válida para esta unidade/i)
    expect(alerta).toHaveTextContent(/número inteiro/i)
    expect(alerta).not.toHaveTextContent(/tente novamente/i)
  })

  it('motivo ausente aponta o campo certo (H9)', async () => {
    configurarApi([detalhe(5)])
    const alerta = await registrarComFalha(new mocks.ApiError(400, 'override_reason_required'))

    expect(alerta).toHaveTextContent(/informe o motivo da exceção/i)
  })

  it('saldo que mudou recarrega o item e orienta a conferir a quantidade (H9)', async () => {
    configurarApi([detalhe(5), detalhe(1)])
    const alerta = await registrarComFalha(new mocks.ApiError(409, 'above_available'))

    expect(alerta).toHaveTextContent(/saldo disponível mudou/i)
    expect(alerta).not.toHaveTextContent(/autorização de gerente/i)
    expect(await screen.findByText('Disponível: 1')).toBeInTheDocument()
  })

  it('item inexistente pede para atualizar a página (H9)', async () => {
    configurarApi([detalhe(5)])
    const alerta = await registrarComFalha(new mocks.ApiError(404, 'item_not_found'))

    expect(alerta).toHaveTextContent(/item não foi encontrado/i)
  })

  it('sem conexão avisa para conferir o saldo antes de repetir (H9)', async () => {
    configurarApi([detalhe(5)])
    const alerta = await registrarComFalha(new mocks.ApiError(0, 'network_error'))

    expect(alerta).toHaveTextContent(/sem conexão/i)
    expect(alerta).toHaveTextContent(/confira/i)
  })

  it('falha ao carregar o pedido oferece "Tentar de novo" (H9)', async () => {
    let tentativas = 0
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/auth/sessao') return Promise.resolve({ usuario: { roles: ['SHIPPING'] } })
      if (url === '/api/pedidos') {
        return Promise.resolve({ pedidos: [{ id: 'p1', numero: '100', cliente: 'Ana' }] })
      }
      if (url === '/api/pedidos/p1') {
        tentativas += 1
        return tentativas === 1
          ? Promise.reject(new Error('falha'))
          : Promise.resolve({ pedido: detalhe(5) })
      }
      return Promise.reject(new Error(`url inesperada: ${url}`))
    })
    render(<EntregasPage />)

    await selecionarPedido()
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar o pedido/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Disponível: 5')).toBeInTheDocument()
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

  function comQuantidades(solicitado: number, executado: number, entregue: number) {
    const base = detalhe(5)
    const quantidades = {
      solicitado: String(solicitado),
      executado: String(executado),
      entregue: String(entregue),
      disponivel: String(executado - entregue),
      pendente: String(Math.max(solicitado - executado, 0)),
    }
    return {
      ...base,
      itens: [{ ...base.itens[0], ...quantidades }],
      totaisPorUnidade: [{ ...base.totaisPorUnidade[0], ...quantidades }],
    }
  }

  it('item com saldo e algo já entregue mostra Entrega parcial (H1)', async () => {
    configurarApi([detalhe(5)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findByText('Entrega parcial')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantidade do item 1')).toBeInTheDocument()
  })

  it('item totalmente entregue mostra Entregue, não "Aguardando produção" (H10)', async () => {
    configurarApi([comQuantidades(10, 10, 10)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findByText('Entregue')).toBeInTheDocument()
    expect(screen.getByText('Item totalmente entregue')).toBeInTheDocument()
    expect(screen.queryByText('Aguardando produção')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Quantidade do item 1')).not.toBeInTheDocument()
  })

  it('tudo o que foi produzido já foi entregue: avisa quanto falta produzir (H10)', async () => {
    configurarApi([detalhe(0)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findAllByText('Aguardando produção')).toHaveLength(2)
    expect(screen.getByText(/Tudo o que já foi produzido foi entregue/)).toBeInTheDocument()
    expect(screen.getByText(/Faltam 2 a produzir/)).toBeInTheDocument()
  })

  it('nada produzido ainda mantém o aviso de que não há saldo (H10)', async () => {
    configurarApi([comQuantidades(10, 0, 0)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findByText(/ainda não tem saldo disponível/)).toBeInTheDocument()
    expect(screen.queryByLabelText('Quantidade do item 1')).not.toBeInTheDocument()
  })

  it('o gerente continua vendo o formulário num item entregue, para autorizar exceção', async () => {
    configurarApi([comQuantidades(10, 10, 10)], 'PRODUCTION_MANAGER')
    render(<EntregasPage />)

    await selecionarPedido()

    expect(await screen.findByText('Item totalmente entregue')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantidade do item 1')).toBeInTheDocument()
  })

  function comUnidade(unit: string, executado: string, entregue: string) {
    const base = detalhe(5)
    const disponivel = String(Number(executado) - Number(entregue))
    const quantidades = { solicitado: executado, executado, entregue, disponivel, pendente: '0' }
    return {
      ...base,
      itens: [{ ...base.itens[0], unit, ...quantidades }],
      totaisPorUnidade: [{ ...base.totaisPorUnidade[0], unidade: unit, ...quantidades }],
    }
  }

  it('o campo diz a unidade, o disponível e a regra de casas decimais da peça (H5)', async () => {
    configurarApi([comUnidade('PC', '8', '3')], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    const campo = await screen.findByLabelText('Quantidade do item 1')

    expect(campo).toHaveAccessibleDescription(/Pode entregar até 5 PC\. Use número inteiro\./)
    expect(campo).toHaveAttribute('step', '1')
  })

  it('para metro o campo aceita 2 casas e avisa (H5)', async () => {
    configurarApi([comUnidade('M', '8.5', '3')], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    const campo = await screen.findByLabelText('Quantidade do item 1')

    expect(campo).toHaveAccessibleDescription(/Pode entregar até 5,50 M\. Até 2 casas decimais\./)
    expect(campo).toHaveAttribute('step', '0.01')
  })

  it('"Entregar tudo" abre a confirmação com todo o disponível, sem digitar (H5, H7)', async () => {
    configurarApi([comUnidade('PC', '8', '3')], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.click(await screen.findByRole('button', { name: 'Entregar tudo (5) do item 1' }))

    const dialogo = await screen.findByRole('dialog')
    expect(dialogo).toHaveTextContent('Você vai entregar 5 do item 1.')
    expect(dialogo).toHaveTextContent('Esta entrega conclui o item.')
    expect(mocks.apiPost).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas', {
        quantidade: '5',
        excecao: false,
        motivoExcecao: undefined,
      }),
    )
  })

  it('"Entregar tudo" em metro envia o valor decimal exato (H5)', async () => {
    configurarApi([comUnidade('M', '8.5', '3')], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.click(await screen.findByRole('button', { name: 'Entregar tudo (5,50) do item 1' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas', {
        quantidade: '5.5',
        excecao: false,
        motivoExcecao: undefined,
      }),
    )
  })

  it('sem saldo não há "Entregar tudo" (H5)', async () => {
    configurarApi([comUnidade('PC', '8', '8')], 'PRODUCTION_MANAGER')
    render(<EntregasPage />)

    await selecionarPedido()
    await screen.findByLabelText('Quantidade do item 1')

    expect(screen.queryByRole('button', { name: /Entregar tudo/ })).not.toBeInTheDocument()
  })

  it('cada item tem o histórico de entregas, que abre sob demanda (EXP-11, H3)', async () => {
    configurarApi([detalhe(5)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    const botao = await screen.findByRole('button', { name: /histórico de entregas/i })
    expect(mocks.apiGet).not.toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas')

    fireEvent.click(botao)

    expect(await screen.findByText(/Paula Expedição/)).toBeInTheDocument()
    expect(screen.getByText('3 entregues')).toBeInTheDocument()
  })

  it('o histórico aberto inclui a entrega recém-registrada, sem fechar e abrir (EXP-11)', async () => {
    configurarApi([detalhe(5), detalhe(2)], 'SHIPPING')
    render(<EntregasPage />)

    await selecionarPedido()
    fireEvent.click(await screen.findByRole('button', { name: /histórico de entregas/i }))
    await screen.findByText(/Paula Expedição/)
    const chamadasAntes = mocks.apiGet.mock.calls.filter(
      ([url]) => url === '/api/pedidos/itens/item_1/entregas',
    ).length

    fireEvent.change(screen.getByLabelText('Quantidade do item 1'), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar entrega do item 1' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar entrega' }))

    await waitFor(() =>
      expect(
        mocks.apiGet.mock.calls.filter(([url]) => url === '/api/pedidos/itens/item_1/entregas')
          .length,
      ).toBeGreaterThan(chamadasAntes),
    )
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
