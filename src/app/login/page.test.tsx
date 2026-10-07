// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { RoleCode } from '@/generated/prisma/client'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, replace: vi.fn(), refresh: vi.fn() }),
}))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: vi.fn(),
  ApiError: mocks.ApiError,
}))

import LoginPage from './page'

function preencher(email: string, senha: string) {
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } })
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
}

function sessaoCom(roles: RoleCode[]) {
  return { usuario: { id: 'u1', roles } }
}

beforeEach(() => {
  mocks.push.mockReset()
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

/** Tela inicial esperada por perfil (FEP-11). */
const DESTINOS: Array<{ perfil: RoleCode; rota: string }> = [
  { perfil: 'PRODUCTION_MANAGER', rota: '/gerente/painel' },
  { perfil: 'SELLER', rota: '/vendedor/pedidos' },
  { perfil: 'SHIPPING', rota: '/expedicao/entregas' },
  { perfil: 'SYSTEM_RESPONSIBLE', rota: '/admin/usuarios' },
]

describe('LoginPage', () => {
  it('associa rótulos e usa tipos de input corretos (FE-03)', () => {
    render(<LoginPage />)

    expect(screen.getByLabelText('E-mail')).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
  })

  it('com credenciais válidas navega para a tela do perfil (FE-01)', async () => {
    mocks.apiPost.mockResolvedValue({ usuario: { id: 'u1' } })
    mocks.apiGet.mockResolvedValue(sessaoCom(['OPERATOR']))
    render(<LoginPage />)

    preencher('ana@example.com', 'segredo')

    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/operador/fila'))
    expect(mocks.apiPost).toHaveBeenCalledWith(
      '/api/auth/login',
      { email: 'ana@example.com', senha: 'segredo' },
      { redirectOnUnauthorized: false },
    )
  })

  it('resolve o perfil pelo endpoint de sessão (FEP-11)', async () => {
    mocks.apiPost.mockResolvedValue({ usuario: { id: 'u1' } })
    mocks.apiGet.mockResolvedValue(sessaoCom(['OPERATOR']))
    render(<LoginPage />)

    preencher('ana@example.com', 'segredo')

    await waitFor(() =>
      expect(mocks.apiGet).toHaveBeenCalledWith('/api/auth/sessao', {
        redirectOnUnauthorized: false,
      }),
    )
  })

  it.each(DESTINOS)(
    'navega para a tela inicial do perfil $perfil (FEP-11)',
    async ({ perfil, rota }) => {
      mocks.apiPost.mockResolvedValue({ usuario: { id: 'u1' } })
      mocks.apiGet.mockResolvedValue(sessaoCom([perfil]))
      render(<LoginPage />)

      preencher('ana@example.com', 'segredo')

      await waitFor(() => expect(mocks.push).toHaveBeenCalledWith(rota))
    },
  )

  it('com credenciais inválidas mostra erro acessível e não navega (FE-02)', async () => {
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(401, 'invalid_credentials'))
    render(<LoginPage />)

    preencher('ana@example.com', 'errada')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/inválidos/i)
    expect(mocks.push).not.toHaveBeenCalled()
  })

  it('com falha de rede mostra erro acessível genérico (FE-14)', async () => {
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(0, 'network_error'))
    render(<LoginPage />)

    preencher('ana@example.com', 'segredo')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível entrar agora/i)
  })

  it('após a falha libera o botão para tentar de novo (FE-14)', async () => {
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(0, 'network_error'))
    render(<LoginPage />)

    preencher('ana@example.com', 'segredo')

    await screen.findByRole('alert')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled())
  })

  it('não redireciona em 401 no próprio login (FE-13)', async () => {
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(401, 'invalid_credentials'))
    render(<LoginPage />)

    preencher('ana@example.com', 'errada')

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalled())
    expect(mocks.apiPost.mock.calls[0]?.[2]).toEqual({ redirectOnUnauthorized: false })
  })
})

describe('LoginPage layout (VIS-04, VIS-05, VIS-06)', () => {
  it('mostra o painel lateral (hero) com a proposta do produto (VIS-04)', () => {
    render(<LoginPage />)

    expect(screen.getByText(/pedidos, produção e expedição/i)).toBeInTheDocument()
  })

  it('esconde o hero no celular e o mostra a partir de 780px (VIS-04, VIS-05)', () => {
    const { container } = render(<LoginPage />)

    const hero = container.querySelector('main > section')
    expect(hero).toHaveClass('hidden')
    expect(hero).toHaveClass('min-[780px]:flex')
  })

  it('mantém um único cabeçalho de nível 1 com a marca (VIS-04)', () => {
    render(<LoginPage />)

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: '3E Operações' })).toBeInTheDocument()
  })

  it('expõe foco visível no botão de entrar (VIS-06)', () => {
    render(<LoginPage />)

    expect(screen.getByRole('button', { name: 'Entrar' })).toHaveClass('focus-visible:ring-2')
  })
})
