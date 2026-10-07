// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
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
  useParams: () => ({ id: 'atv_1' }),
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

import ExecutarAtividadePage from './page'

interface Ordem {
  atividadeId: string
  pedido: string
  item: string
  setor: string
  unidade: string
  solicitado: number
  executado: number
  pendente: number
}

function ordem(overrides: Partial<Ordem> = {}): Ordem {
  return {
    atividadeId: 'atv_1',
    pedido: '100',
    item: 'Chapa dobrada',
    setor: 'Corte e Dobra',
    unidade: 'peca',
    solicitado: 10,
    executado: 2,
    pendente: 8,
    ...overrides,
  }
}

function configurarApiGet(ordens: Ordem[]) {
  let chamadas = 0
  mocks.apiGet.mockImplementation((url: string) => {
    if (url.startsWith('/api/motivos')) return Promise.resolve({ motivos: [] })
    const resposta = ordens[Math.min(chamadas, ordens.length - 1)]
    chamadas += 1
    return Promise.resolve({ ordem: resposta })
  })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

describe('ExecutarAtividadePage', () => {
  it('mostra carregando enquanto busca a ordem (FE-09)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<ExecutarAtividadePage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('campo de quantidade é numérico e rotulado, com teclado numérico no celular (FE-10)', async () => {
    configurarApiGet([ordem()])
    render(<ExecutarAtividadePage />)

    const input = await screen.findByLabelText('Quantidade produzida')
    expect(input).toHaveAttribute('type', 'number')
    expect(input).toHaveAttribute('inputmode', 'decimal')
  })

  it('quantidade inválida mostra mensagem e não registra (FE-10)', async () => {
    configurarApiGet([ordem()])
    render(<ExecutarAtividadePage />)

    const input = await screen.findByLabelText('Quantidade produzida')
    fireEvent.change(input, { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar execução' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/maior que zero/i)
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('quantidade válida registra a execução e confirma (FE-09)', async () => {
    configurarApiGet([ordem()])
    mocks.apiPost.mockResolvedValue({ execucao: { id: 'ex_1' } })
    render(<ExecutarAtividadePage />)

    const input = await screen.findByLabelText('Quantidade produzida')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar execução' }))

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(1))
    expect(mocks.apiPost).toHaveBeenCalledWith('/api/producao/atividades/atv_1/execucoes', {
      quantidade: '8',
    })
    expect(await screen.findByText('Execução registrada.')).toBeInTheDocument()
  })

  it('erro de quantidade da API vira mensagem acessível (FE-14)', async () => {
    configurarApiGet([ordem()])
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(400, 'invalid_quantity'))
    render(<ExecutarAtividadePage />)

    const input = await screen.findByLabelText('Quantidade produzida')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar execução' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/quantidade inválida/i)
  })

  it('após registrar, recarrega a ordem com o novo saldo (FE-09)', async () => {
    configurarApiGet([ordem({ pendente: 8 }), ordem({ executado: 10, pendente: 0 })])
    mocks.apiPost.mockResolvedValue({ execucao: { id: 'ex_1' } })
    render(<ExecutarAtividadePage />)

    const input = await screen.findByLabelText('Quantidade produzida')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar execução' }))

    expect(await screen.findByText('Pendente: 0 peca')).toBeInTheDocument()
  })

  it('inclui o formulário de ocorrência da atividade (FE-11)', async () => {
    configurarApiGet([ordem()])
    render(<ExecutarAtividadePage />)

    expect(await screen.findByLabelText('Tipo de ocorrência')).toBeInTheDocument()
  })
})
