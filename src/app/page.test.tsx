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

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: { findById: mocks.findById },
}))

import Home from './page'

function tokenValido() {
  return assinarSessao({ userId: 'u1', expiraEm: new Date(Date.now() + 60_000) })
}

describe('Home (/)', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.redirect.mockClear()
    mocks.findById.mockReset()
    mocks.getCookie.mockReset()
  })

  it('redireciona ao login sem sessão', async () => {
    mocks.getCookie.mockReturnValue(undefined)
    await expect(Home()).rejects.toThrow('REDIRECT:/login')
  })

  it('redireciona ao login quando o usuário não tem perfis', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue({ id: 'u1', roles: [] })
    await expect(Home()).rejects.toThrow('REDIRECT:/login')
  })

  it('leva o operador para a fila', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue({ id: 'u1', roles: ['OPERATOR'] })
    await expect(Home()).rejects.toThrow('REDIRECT:/operador/fila')
  })

  it('leva o gerente para o painel', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue({ id: 'u1', roles: ['PRODUCTION_MANAGER'] })
    await expect(Home()).rejects.toThrow('REDIRECT:/gerente/painel')
  })

  it('leva o responsável técnico para a integração (LAC-09)', async () => {
    mocks.getCookie.mockReturnValue({ value: tokenValido() })
    mocks.findById.mockResolvedValue({ id: 'u1', roles: ['TECHNICAL_RESPONSIBLE'] })
    await expect(Home()).rejects.toThrow('REDIRECT:/tecnico/integracao')
  })
})
