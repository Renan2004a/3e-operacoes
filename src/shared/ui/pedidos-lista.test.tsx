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

import { PedidosLista, type PedidoListado } from './pedidos-lista'

const PEDIDO = { id: 'p1', numero: '100', cliente: 'Ana', status: 'PENDING' as const }

function resposta(
  pedidos: PedidoListado[] = [PEDIDO],
  paginacao: Partial<{
    limite: number
    offset: number
    pagina: number
    total: number
    totalPaginas: number
  }> = {},
) {
  return {
    pedidos,
    paginacao: {
      limite: 20,
      offset: 0,
      pagina: 1,
      total: pedidos.length,
      totalPaginas: pedidos.length > 0 ? 1 : 0,
      ...paginacao,
    },
  }
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  // Isola os testes: o componente lê os filtros da URL (preservação de contexto).
  window.history.replaceState({}, '', '/')
})

afterEach(cleanup)

describe('PedidosLista', () => {
  it('mostra o estado de carregando enquanto busca (FEP-03)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista os pedidos com número, cliente e status textual (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta())
    render(<PedidosLista onSelecionar={vi.fn()} />)

    const tabela = await screen.findByRole('table', { name: 'Pedidos' })
    expect(within(tabela).getByText('Pedido 100')).toBeInTheDocument()
    expect(within(tabela).getByText('Ana')).toBeInTheDocument()
    expect(within(tabela).getByText('Pendente')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos')
  })

  it('usa "Produção concluída" como rótulo do status COMPLETED (AD-013)', async () => {
    mocks.apiGet.mockResolvedValue(
      resposta([{ id: 'p2', numero: '200', cliente: 'Bia', status: 'COMPLETED' as const }]),
    )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    const tabela = await screen.findByRole('table', { name: 'Pedidos' })
    expect(within(tabela).getByText('Produção concluída')).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Status')).getByText('Produção concluída'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Concluído')).not.toBeInTheDocument()
  })

  it('mostra estado vazio quando não há pedidos (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(await screen.findByText('Sem pedidos')).toBeInTheDocument()
  })

  it('mostra erro acessível e tentar de novo recarrega (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce(resposta())
    render(<PedidosLista onSelecionar={vi.fn()} />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os pedidos/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
  })

  it('aplica os filtros de cliente, setor, status e período na consulta (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Sem pedidos')
    expect(screen.getByRole('group', { name: 'Data de importação' })).toHaveAccessibleDescription(
      'Considera a entrada do pedido no 3E.',
    )
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Ana' } })
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'CORTE_DOBRA' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PENDING' } })
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-01-01' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-01-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenLastCalledWith(
        '/api/pedidos?cliente=Ana&setor=CORTE_DOBRA&status=PENDING&de=2026-01-01&ate=2026-01-31',
      ),
    )
  })

  it('oferece os setores por código como opções fixas, com "Todos" como padrão (LAC-04)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    const setor = screen.getByLabelText('Setor')
    expect(setor.tagName).toBe('SELECT')
    expect(setor).toHaveValue('')
    const opcoes = within(setor)
      .getAllByRole('option')
      .map((opcao) => [opcao.textContent, opcao.getAttribute('value')])
    expect(opcoes).toEqual([
      ['Todos', ''],
      ['Corte e Dobra', 'CORTE_DOBRA'],
      ['Telhas', 'TELHAS'],
      ['Revenda', 'REVENDA'],
    ])
  })

  it('não envia o setor quando "Todos" está selecionado (LAC-04)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'TELHAS' } })
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos'))
  })

  it('restaura o setor da URL quando é um código válido (FEP-03)', async () => {
    window.history.replaceState({}, '', '/?setor=TELHAS')
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Sem pedidos')
    expect(screen.getByLabelText('Setor')).toHaveValue('TELHAS')
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos?setor=TELHAS')
  })

  it('ignora setor inválido da URL e não o envia à API (LAC-04)', async () => {
    window.history.replaceState({}, '', '/?setor=Telhas')
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Sem pedidos')
    expect(screen.getByLabelText('Setor')).toHaveValue('')
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos')
  })

  it('documenta o filtro de cliente como substring sem diferenciar maiúsculas (QF-09)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(screen.getByText(/não diferencia maiúsculas/i)).toBeInTheDocument()
  })

  it('expõe foco visível no filtro de status (QF-04)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(screen.getByLabelText('Status')).toHaveClass('focus-visible:ring-2')
  })

  it('envia o cliente como substring, preservando o trecho digitado (QF-09)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Cons' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos?cliente=Cons'))
  })

  it('remove os espaços em volta do trecho de cliente (QF-09)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '  Ana  ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos?cliente=Ana'))
  })

  it('omite o parâmetro de cliente quando o campo está vazio (QF-09)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos'))
  })

  it('oferece o campo de número do pedido com orientação de trecho (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(screen.getByLabelText('Pesquisar por número')).toBeInTheDocument()
    expect(screen.getByText(/trecho do número comercial/i)).toBeInTheDocument()
  })

  it('envia o número do pedido sem os espaços em volta (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Pesquisar por número'), {
      target: { value: '  70435  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos?numero=70435'))
  })

  it('combina a pesquisa por número com os demais filtros (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Pesquisar por número'), { target: { value: '7043' } })
    fireEvent.change(screen.getByLabelText('Setor'), { target: { value: 'TELHAS' } })
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'PENDING' } })
    fireEvent.change(screen.getByLabelText('De'), { target: { value: '2026-10-01' } })
    fireEvent.change(screen.getByLabelText('Até'), { target: { value: '2026-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenLastCalledWith(
        '/api/pedidos?numero=7043&setor=TELHAS&status=PENDING&de=2026-10-01&ate=2026-10-31',
      ),
    )
  })

  it('omite o número quando o campo está vazio (FEP-03)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)
    await screen.findByText('Sem pedidos')

    fireEvent.change(screen.getByLabelText('Pesquisar por número'), { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos'))
  })

  it('restaura o número da URL ao voltar do detalhe (FEP-03)', async () => {
    window.history.replaceState({}, '', '/?numero=70435&setor=TELHAS')
    mocks.apiGet.mockResolvedValue(resposta([]))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Sem pedidos')
    expect(screen.getByLabelText('Pesquisar por número')).toHaveValue('70435')
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos?numero=70435&setor=TELHAS')
  })

  it('selecionar um pedido aciona o chamador com o pedido e o contexto da listagem (FEP-03)', async () => {
    window.history.replaceState({}, '', '/vendedor/pedidos?cliente=Ana&pagina=2')
    const onSelecionar = vi.fn()
    mocks.apiGet.mockResolvedValue(resposta())
    render(<PedidosLista onSelecionar={onSelecionar} />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(onSelecionar).toHaveBeenCalledWith(PEDIDO, {
      retorno: '/vendedor/pedidos?cliente=Ana&pagina=2',
    })
  })

  it('permite rolagem horizontal interna da tabela em telas estreitas (VIS-11)', async () => {
    mocks.apiGet.mockResolvedValue(resposta())
    render(<PedidosLista onSelecionar={vi.fn()} />)

    const tabela = await screen.findByRole('table', { name: 'Pedidos' })
    expect(tabela.parentElement).toHaveClass('overflow-x-auto')
  })
  it('mostra o total de pedidos e a página atual (A1)', async () => {
    mocks.apiGet.mockResolvedValue(
      resposta(
        Array.from({ length: 20 }, (_, i) => ({ ...PEDIDO, id: `p${i}` })),
        {
          total: 137,
          totalPaginas: 7,
        },
      ),
    )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(await screen.findByText(/137 pedido\(s\) encontrado\(s\)/)).toBeInTheDocument()
    const paginacao = screen.getByRole('navigation', { name: 'Paginação' })
    expect(within(paginacao).getByText(/página 1 de 7/i)).toBeInTheDocument()
  })

  it('navega para a próxima página enviando limite e offset (A1)', async () => {
    mocks.apiGet
      .mockResolvedValueOnce(resposta([PEDIDO], { total: 45, totalPaginas: 3 }))
      .mockResolvedValueOnce(
        resposta([{ ...PEDIDO, id: 'p2', numero: '200' }], {
          offset: 20,
          pagina: 2,
          total: 45,
          totalPaginas: 3,
        }),
      )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Pedido 100')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos?limite=20&offset=20'),
    )
    expect(await screen.findByText('Pedido 200')).toBeInTheDocument()
    const paginacao = screen.getByRole('navigation', { name: 'Paginação' })
    expect(within(paginacao).getByText(/página 2 de 3/i)).toBeInTheDocument()
  })

  it('volta para a página anterior (A1)', async () => {
    window.history.replaceState({}, '', '/?pagina=2')
    mocks.apiGet
      .mockResolvedValueOnce(
        resposta([{ ...PEDIDO, id: 'p2', numero: '200' }], {
          offset: 20,
          pagina: 2,
          total: 45,
          totalPaginas: 3,
        }),
      )
      .mockResolvedValueOnce(resposta([PEDIDO], { total: 45, totalPaginas: 3 }))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Pedido 200')
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos'))
  })

  it('desabilita Anterior na primeira página e Próxima na última (A1)', async () => {
    mocks.apiGet.mockResolvedValue(resposta([PEDIDO], { total: 45, totalPaginas: 3 }))
    const { unmount } = render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Pedido 100')
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled()
    unmount()

    window.history.replaceState({}, '', '/?pagina=3')
    mocks.apiGet.mockResolvedValue(
      resposta([PEDIDO], { offset: 40, pagina: 3, total: 45, totalPaginas: 3 }),
    )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled()
  })

  it('preserva os filtros ao trocar de página e os inclui na URL (A1)', async () => {
    window.history.replaceState({}, '', '/?setor=TELHAS')
    mocks.apiGet
      .mockResolvedValueOnce(resposta([PEDIDO], { total: 45, totalPaginas: 3 }))
      .mockResolvedValueOnce(
        resposta([PEDIDO], { offset: 20, pagina: 2, total: 45, totalPaginas: 3 }),
      )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Pedido 100')
    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }))

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenLastCalledWith(
        '/api/pedidos?setor=TELHAS&limite=20&offset=20',
      ),
    )
    expect(window.location.search).toContain('setor=TELHAS')
    expect(window.location.search).toContain('pagina=2')
  })

  it('restaura a página da URL ao voltar do detalhe (A1)', async () => {
    window.history.replaceState({}, '', '/?setor=TELHAS&pagina=2')
    mocks.apiGet.mockResolvedValue(
      resposta([PEDIDO], { offset: 20, pagina: 2, total: 45, totalPaginas: 3 }),
    )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Pedido 100')
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos?setor=TELHAS&limite=20&offset=20')
  })

  it('volta para a primeira página quando os filtros são alterados (A1)', async () => {
    window.history.replaceState({}, '', '/?pagina=2')
    mocks.apiGet.mockResolvedValue(
      resposta([PEDIDO], { offset: 20, pagina: 2, total: 45, totalPaginas: 3 }),
    )
    render(<PedidosLista onSelecionar={vi.fn()} />)

    await screen.findByText('Pedido 100')
    fireEvent.change(screen.getByLabelText('Cliente'), { target: { value: 'Ana' } })
    fireEvent.click(screen.getByRole('button', { name: 'Filtrar' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos?cliente=Ana'))
    expect(window.location.search).toBe('?cliente=Ana')
  })

  it('mostra a página inexistente com opção de voltar à primeira (A1, D2)', async () => {
    window.history.replaceState({}, '', '/?pagina=4')
    mocks.apiGet
      .mockResolvedValueOnce(resposta([], { offset: 60, pagina: 4, total: 25, totalPaginas: 2 }))
      .mockResolvedValueOnce(resposta([PEDIDO], { total: 25, totalPaginas: 2 }))
    render(<PedidosLista onSelecionar={vi.fn()} />)

    expect(await screen.findByText('Página não encontrada')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Ir para a primeira página' }))

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos'))
  })

  it('volta para a primeira página ao recarregar após importar um pedido (A1, D5)', async () => {
    window.history.replaceState({}, '', '/?pagina=2')
    mocks.apiGet.mockResolvedValue(
      resposta([PEDIDO], { offset: 20, pagina: 2, total: 45, totalPaginas: 3 }),
    )
    const { rerender } = render(<PedidosLista onSelecionar={vi.fn()} recarregarToken={0} />)

    await screen.findByText('Pedido 100')
    rerender(<PedidosLista onSelecionar={vi.fn()} recarregarToken={1} />)

    await waitFor(() => expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/pedidos'))
  })
})
