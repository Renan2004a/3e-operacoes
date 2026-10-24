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
    status: number
    code: string
    constructor(status = 0, code = '', message?: string) {
      super(message)
      this.status = status
      this.code = code
    }
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
        deadlineAt: null,
        activityDeadlineAt: null,
        sectorCode: null,
        sectorName: null,
        activityStatus: null,
        suggestedSectorId: 'setor_telhas',
        remessas: [] as RemessaMock[],
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

function configurarApiCom(pedido: ReturnType<typeof detalhe>) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/pedidos/p1') return Promise.resolve({ pedido })
    if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

function itemDetalhe(
  overrides: Partial<ReturnType<typeof detalhe>['itens'][number]> = {},
): ReturnType<typeof detalhe>['itens'][number] {
  return { ...detalhe().itens[0], ...overrides }
}

interface RemessaMock {
  id: string
  remessa: number
  scheduledAt: string
  confirmedAt: string | null
}

function remessaDetalhe(overrides: Partial<RemessaMock> = {}): RemessaMock {
  return {
    id: 'r1',
    remessa: 1,
    scheduledAt: '2026-12-15T15:00:00.000Z',
    confirmedAt: null,
    ...overrides,
  }
}

function configurarApiComRemessas(remessas: RemessaMock[]) {
  configurarApiCom({
    ...detalhe(),
    itens: [itemDetalhe({ remessas })],
  })
}

function promessaAdiada<T>() {
  let resolver!: (valor: T) => void
  let rejeitar!: (erro?: unknown) => void
  const promessa = new Promise<T>((resolve, reject) => {
    resolver = resolve
    rejeitar = reject
  })
  return { promessa, resolver, rejeitar }
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

  it('exibe o prazo persistido ao carregar e mantém após recarregar a página (AD-009)', async () => {
    const comPrazo = {
      ...detalhe(),
      itens: [{ ...detalhe().itens[0], deadlineAt: '2026-02-02T02:59:59.999Z' }],
    }
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/pedidos/p1') return Promise.resolve({ pedido: comPrazo })
      if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
      return Promise.reject(new Error(`url inesperada: ${url}`))
    })

    const { unmount } = render(<PedidoVendedorPage />)

    expect(await screen.findByLabelText('Prazo do item 1')).toHaveValue('2026-02-01')
    expect(screen.getByText('Prazo de entrega: 01/02/2026')).toBeInTheDocument()

    unmount()
    render(<PedidoVendedorPage />)

    expect(await screen.findByLabelText('Prazo do item 1')).toHaveValue('2026-02-01')
    expect(screen.getByText('Prazo de entrega: 01/02/2026')).toBeInTheDocument()
  })

  it('exibe “Sem prazo” quando o item não tem prazo (AD-009)', async () => {
    configurarApi()
    render(<PedidoVendedorPage />)

    expect(await screen.findByText('Sem prazo')).toBeInTheDocument()
    expect(screen.getByLabelText('Prazo do item 1')).toHaveValue('')
  })

  it('usa o prazo devolvido pela API após salvar, sem deslocar o dia (AD-009)', async () => {
    configurarApi()
    mocks.apiPatch.mockResolvedValue({
      item: { id: 'item_1', deadlineAt: '2026-03-11T02:59:59.999Z' },
    })
    render(<PedidoVendedorPage />)

    fireEvent.change(await screen.findByLabelText('Prazo do item 1'), {
      target: { value: '2026-03-10' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar prazo do item 1' }))

    expect(await screen.findByText('Prazo de entrega: 10/03/2026')).toBeInTheDocument()
    expect(screen.getByLabelText('Prazo do item 1')).toHaveValue('2026-03-10')
  })

  it('mostra o prazo operacional apenas para leitura (AD-009, D5)', async () => {
    const comPrazoSetor = {
      ...detalhe(),
      itens: [
        {
          ...detalhe().itens[0],
          classificationStatus: 'CLASSIFIED',
          sectorId: 'setor_telhas',
          sectorCode: 'TELHAS',
          sectorName: 'Telhas',
          activityStatus: 'PENDING',
          activityDeadlineAt: '2026-02-02T02:59:59.999Z',
        },
      ],
    }
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/pedidos/p1') return Promise.resolve({ pedido: comPrazoSetor })
      if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
      return Promise.reject(new Error(`url inesperada: ${url}`))
    })
    render(<PedidoVendedorPage />)

    expect(await screen.findByText('Prazo do setor: 01/02/2026 · Atrasado')).toBeInTheDocument()
    expect(screen.queryByLabelText('Prazo do setor')).not.toBeInTheDocument()
  })

  it('não oferece o formulário de prazo para perfil sem definir_prazo, mas mantém a leitura (D9)', async () => {
    const comPrazo = {
      ...detalhe(),
      itens: [{ ...detalhe().itens[0], deadlineAt: '2026-02-02T02:59:59.999Z' }],
    }
    mocks.apiGet.mockImplementation((url: string) => {
      if (url === '/api/pedidos/p1') return Promise.resolve({ pedido: comPrazo })
      if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
      if (url === '/api/auth/sessao') {
        return Promise.resolve({ usuario: { id: 'user_1', expiraEm: null, roles: ['OPERATOR'] } })
      }
      return Promise.reject(new Error(`url inesperada: ${url}`))
    })
    render(<PedidoVendedorPage />)

    expect(await screen.findByText('Prazo de entrega: 01/02/2026')).toBeInTheDocument()
    expect(screen.queryByLabelText('Prazo do item 1')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Salvar prazo do item 1' })).not.toBeInTheDocument()
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

function detalheDesmembrado(bloqueioCorrecaoSetor: string | null = null) {
  return {
    ...detalhe(),
    itens: [
      {
        ...detalhe().itens[0],
        classificationStatus: 'CLASSIFIED',
        sectorId: 'setor_corte',
        sectorCode: 'CORTE_DOBRA',
        sectorName: 'Corte e Dobra',
        activityStatus: 'PENDING',
        suggestedSectorId: null,
        bloqueioCorrecaoSetor,
      },
    ],
  }
}

function configurarCorrecao({
  perfis,
  bloqueio = null,
}: {
  perfis: string[]
  bloqueio?: string | null
}) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/pedidos/p1') {
      return Promise.resolve({ pedido: detalheDesmembrado(bloqueio) })
    }
    if (url === '/api/setores') return Promise.resolve({ sectors: SETORES })
    if (url === '/api/auth/sessao') {
      return Promise.resolve({ usuario: { id: 'user_1', expiraEm: null, roles: perfis } })
    }
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

describe('correção de setor do item desmembrado', () => {
  it('permite ao vendedor corrigir o setor sem informar justificativa', async () => {
    configurarCorrecao({ perfis: ['SELLER'] })
    mocks.apiPatch.mockResolvedValue({})
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir setor do item 1' }))
    expect(screen.queryByLabelText(/Motivo da correção/)).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Novo setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correção de setor do item 1' }))

    await waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/pedidos/itens/item_1/setor', {
        sectorId: 'setor_telhas',
        motivo: null,
      }),
    )
    expect(await screen.findByText('Setor corrigido com sucesso.')).toBeInTheDocument()
    expect(screen.getByText(/Setor: Telhas/)).toBeInTheDocument()
  })

  it('mostra a ação desabilitada com o motivo quando há registro operacional', async () => {
    configurarCorrecao({
      perfis: ['SELLER'],
      bloqueio: 'O item já possui execução registrada.',
    })
    render(<PedidoVendedorPage />)

    expect(await screen.findByText('Correção bloqueada')).toBeInTheDocument()
    expect(screen.getByText(/O item já possui execução registrada\./)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Corrigir setor do item 1' })).toBeDisabled()
  })

  it('não oferece a correção para perfil sem permissão', async () => {
    configurarCorrecao({ perfis: ['OPERATOR'] })
    render(<PedidoVendedorPage />)

    expect(await screen.findByText('Setor: Corte e Dobra', { exact: false })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Corrigir setor do item 1' }),
    ).not.toBeInTheDocument()
  })

  it('exige motivo do gerente antes de enviar a correção', async () => {
    configurarCorrecao({ perfis: ['PRODUCTION_MANAGER'] })
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir setor do item 1' }))
    fireEvent.change(screen.getByLabelText('Novo setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correção de setor do item 1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Informe o motivo da correção.')
    expect(mocks.apiPatch).not.toHaveBeenCalled()
  })

  it('bloqueia motivo com mais de 500 caracteres Unicode antes de enviar', async () => {
    configurarCorrecao({ perfis: ['SYSTEM_RESPONSIBLE'] })
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir setor do item 1' }))
    fireEvent.change(screen.getByLabelText('Novo setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.change(screen.getByLabelText(/Motivo da correção/), {
      target: { value: 'a'.repeat(501) },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correção de setor do item 1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('no máximo 500 caracteres')
    expect(mocks.apiPatch).not.toHaveBeenCalled()
  })

  it('envia o motivo validado para o gerente e aceita 500 caracteres com emoji', async () => {
    configurarCorrecao({ perfis: ['PRODUCTION_MANAGER'] })
    mocks.apiPatch.mockResolvedValue({})
    render(<PedidoVendedorPage />)

    const motivo = `${'a'.repeat(499)}😀`
    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir setor do item 1' }))
    fireEvent.change(screen.getByLabelText('Novo setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.change(screen.getByLabelText(/Motivo da correção/), { target: { value: motivo } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correção de setor do item 1' }))

    await waitFor(() =>
      expect(mocks.apiPatch).toHaveBeenCalledWith('/api/pedidos/itens/item_1/setor', {
        sectorId: 'setor_telhas',
        motivo,
      }),
    )
  })

  it('mostra a mensagem clara quando o servidor responde conflito 409', async () => {
    configurarCorrecao({ perfis: ['SELLER'] })
    const { ApiError } = await import('@/shared/http/api-client')
    mocks.apiPatch.mockRejectedValue(new ApiError(409, 'operational_records'))
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Corrigir setor do item 1' }))
    fireEvent.change(screen.getByLabelText('Novo setor do item 1'), {
      target: { value: 'setor_telhas' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar correção de setor do item 1' }))

    expect(
      await screen.findByText('O item já possui registros operacionais e não pode mudar de setor.'),
    ).toBeInTheDocument()
  })
})

describe('proteção das ações de remessas', () => {
  it('faz uma única confirmação em cliques rápidos e mantém remessas independentes', async () => {
    configurarApiComRemessas([
      remessaDetalhe(),
      remessaDetalhe({ id: 'r2', remessa: 2, scheduledAt: '2026-12-20T15:00:00.000Z' }),
    ])
    const adiada = promessaAdiada<{ remessa: RemessaMock }>()
    mocks.apiPatch.mockReturnValue(adiada.promessa)
    render(<PedidoVendedorPage />)

    const confirmar1 = await screen.findByRole('button', {
      name: 'Confirmar 1ª remessa do item 1',
    })
    fireEvent.click(confirmar1)
    fireEvent.click(confirmar1)

    await waitFor(() => expect(mocks.apiPatch).toHaveBeenCalledTimes(1))
    expect(mocks.apiPatch).toHaveBeenCalledWith('/api/pedidos/remessas/r1', {})
    await waitFor(() => expect(confirmar1).toHaveTextContent('Confirmando…'))
    expect(screen.getByRole('button', { name: 'Remover 1ª remessa do item 1' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirmar 2ª remessa do item 1' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Remover 2ª remessa do item 1' })).toBeEnabled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()

    adiada.resolver({
      remessa: remessaDetalhe({ confirmedAt: '2026-12-16T15:00:00.000Z' }),
    })
    expect(await screen.findByText('Remessa confirmada.')).toBeInTheDocument()
    expect(screen.getByText(/Confirmada em/)).toBeInTheDocument()
    expect(mocks.apiPatch).toHaveBeenCalledTimes(1)
  })

  it('pede confirmação antes de excluir e cancelar não envia requisição', async () => {
    configurarApiComRemessas([remessaDetalhe()])
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover 1ª remessa do item 1' }))

    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveAccessibleName('Excluir 1ª remessa?')
    expect(dialogo).toHaveTextContent(/15\/12\/2026/)
    expect(dialogo).toHaveTextContent(/Entregas e saldos não serão alterados/)
    expect(mocks.apiDelete).not.toHaveBeenCalled()

    const cancelar = screen.getByRole('button', { name: 'Cancelar' })
    await waitFor(() => expect(cancelar).toHaveFocus())
    fireEvent.click(cancelar)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText(/1ª remessa · prevista para/)).toBeInTheDocument()
    expect(mocks.apiDelete).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Remover 1ª remessa do item 1' })).toHaveFocus(),
    )
  })

  it('fecha a confirmação com Escape sem excluir', async () => {
    configurarApiComRemessas([remessaDetalhe()])
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover 1ª remessa do item 1' }))
    const dialogo = await screen.findByRole('alertdialog')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toHaveFocus())

    fireEvent.keyDown(dialogo, { key: 'Escape' })

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByText(/1ª remessa · prevista para/)).toBeInTheDocument()
    expect(mocks.apiDelete).not.toHaveBeenCalled()
  })

  it('exclui uma única vez após a confirmação e atualiza a tela', async () => {
    configurarApiComRemessas([remessaDetalhe()])
    const adiada = promessaAdiada<void>()
    mocks.apiDelete.mockReturnValue(adiada.promessa)
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover 1ª remessa do item 1' }))
    const excluir = await screen.findByRole('button', { name: 'Excluir remessa' })
    fireEvent.click(excluir)
    fireEvent.click(excluir)

    await waitFor(() => expect(mocks.apiDelete).toHaveBeenCalledTimes(1))
    expect(mocks.apiDelete).toHaveBeenCalledWith('/api/pedidos/remessas/r1')
    await waitFor(() => expect(excluir).toHaveTextContent('Excluindo…'))
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Confirmar 1ª remessa do item 1' })).toBeDisabled()
    expect(mocks.apiPatch).not.toHaveBeenCalled()
    expect(mocks.apiPost).not.toHaveBeenCalled()

    adiada.resolver()
    expect(await screen.findByText('Remessa excluída.')).toBeInTheDocument()
    expect(screen.queryByText(/1ª remessa · prevista para/)).not.toBeInTheDocument()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('falha na exclusão preserva a remessa e permite nova tentativa', async () => {
    configurarApiComRemessas([remessaDetalhe()])
    mocks.apiDelete.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce(undefined)
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover 1ª remessa do item 1' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Excluir remessa' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível excluir a remessa. Tente novamente.',
    )
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    expect(screen.getByText(/1ª remessa · prevista para/)).toBeInTheDocument()
    const tentarNovamente = screen.getByRole('button', { name: 'Excluir remessa' })
    expect(tentarNovamente).toBeEnabled()

    fireEvent.click(tentarNovamente)

    expect(await screen.findByText('Remessa excluída.')).toBeInTheDocument()
    expect(mocks.apiDelete).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('falha na confirmação preserva a remessa e permite nova tentativa', async () => {
    configurarApiComRemessas([remessaDetalhe()])
    mocks.apiPatch.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce({
      remessa: remessaDetalhe({ confirmedAt: '2026-12-16T15:00:00.000Z' }),
    })
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Confirmar 1ª remessa do item 1' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível confirmar a remessa. Tente novamente.',
    )
    expect(screen.getByText(/1ª remessa · prevista para/)).toBeInTheDocument()
    const tentarNovamente = screen.getByRole('button', {
      name: 'Confirmar 1ª remessa do item 1',
    })
    expect(tentarNovamente).toBeEnabled()

    fireEvent.click(tentarNovamente)

    expect(await screen.findByText('Remessa confirmada.')).toBeInTheDocument()
    expect(mocks.apiPatch).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('avisa sobre o registro de confirmação ao excluir remessa confirmada (D6 pendente)', async () => {
    configurarApiComRemessas([remessaDetalhe({ confirmedAt: '2026-12-16T15:00:00.000Z' })])
    mocks.apiDelete.mockResolvedValue(undefined)
    render(<PedidoVendedorPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Remover 1ª remessa do item 1' }))
    const dialogo = await screen.findByRole('alertdialog')
    expect(dialogo).toHaveTextContent(/está confirmada/)
    expect(dialogo).toHaveTextContent(/registro da confirmação/)
    expect(mocks.apiDelete).not.toHaveBeenCalled()

    // AD-016/D6 segue pendente: a remoção de remessa confirmada permanece
    // permitida, sem alterar entregas ou saldos. Nenhuma auditoria foi criada.
    fireEvent.click(screen.getByRole('button', { name: 'Excluir remessa' }))

    expect(await screen.findByText('Remessa excluída.')).toBeInTheDocument()
    expect(mocks.apiDelete).toHaveBeenCalledWith('/api/pedidos/remessas/r1')
  })
})
