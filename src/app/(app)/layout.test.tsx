import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '@/modules/auth/sessao'

const mocks = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
  findById: vi.fn(),
  getCookie: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => mocks.getCookie() }),
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: { findById: mocks.findById },
}))

vi.mock('@/shared/ui/app-shell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}))

import AppLayout from './layout'

function tokenValido() {
  return assinarSessao({ userId: 'u1', expiraEm: new Date(Date.now() + 60_000) })
}

describe('AppLayout', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.redirect.mockClear()
    mocks.findById.mockReset()
    mocks.getCookie.mockReset()
  })

  it('redireciona ao login sem sessão (FE-13)', async () => {
    mocks.getCookie.mockReturnValue(undefined)

    await expect(AppLayout({ children: null })).rejects.toThrow('REDIRECT:/login')
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('não faz fail-open: redireciona quando o usuário não tem perfis (FE-04)', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue({ id: 'u1', name: 'Sem perfil', roles: [] })

    await expect(AppLayout({ children: null })).rejects.toThrow('REDIRECT:/login')
    expect(mocks.redirect).toHaveBeenCalledWith('/login')
  })

  it('não faz fail-open: redireciona quando o usuário não existe (FE-04)', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue(null)

    await expect(AppLayout({ children: null })).rejects.toThrow('REDIRECT:/login')
  })

  it('renderiza o shell quando há perfil (FE-04)', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue({ id: 'u1', name: 'Ana', roles: ['OPERATOR'] })

    const resultado = await AppLayout({ children: null })

    expect(resultado).toBeTruthy()
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
