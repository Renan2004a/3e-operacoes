import type { RoleCode } from '@/generated/prisma/client'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '@/modules/auth/sessao'

const state = vi.hoisted(() => ({
  cookie: null as string | null,
  usuarios: {} as Record<
    string,
    { id: string; name: string; status: 'ACTIVE' | 'INACTIVE'; roles: RoleCode[] }
  >,
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (nome: string) => (nome === '3e_session' && state.cookie ? { value: state.cookie } : undefined),
  }),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`)
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => {
      const usuario = state.usuarios[id]
      if (!usuario) return null
      return { ...usuario, email: `${id}@teste.local`, sectorIds: [] }
    },
  },
}))

import { exigirAcessoPagina } from './autorizacao-pagina'

const original = process.env.SESSION_SECRET
process.env.SESSION_SECRET = 'segredo-de-teste-autorizacao-pagina'

function cookieDe(userId: string): string {
  return assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
}

describe('exigirAcessoPagina', () => {
  beforeEach(() => {
    state.cookie = null
    state.usuarios = {
      u_seller: { id: 'u_seller', name: 'Vendedor', status: 'ACTIVE', roles: ['SELLER'] },
      u_manager: {
        id: 'u_manager',
        name: 'Gerente',
        status: 'ACTIVE',
        roles: ['PRODUCTION_MANAGER'],
      },
      u_shipping: { id: 'u_shipping', name: 'Expedição', status: 'ACTIVE', roles: ['SHIPPING'] },
      u_inativo: { id: 'u_inativo', name: 'Inativo', status: 'INACTIVE', roles: ['SELLER'] },
    }
  })

  afterAll(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('redireciona ao login sem sessão', async () => {
    await expect(exigirAcessoPagina()).rejects.toThrow('REDIRECT:/login')
  })

  it('redireciona usuário inativo ao login', async () => {
    state.cookie = cookieDe('u_inativo')
    await expect(exigirAcessoPagina()).rejects.toThrow('REDIRECT:/login')
  })

  it('bloqueia Vendedor na área do Gerente e o mantém na própria tela inicial', async () => {
    state.cookie = cookieDe('u_seller')
    await expect(exigirAcessoPagina({ perfis: ['PRODUCTION_MANAGER'] })).rejects.toThrow(
      'REDIRECT:/vendedor/pedidos',
    )
  })

  it('permite Gerente na área do Gerente', async () => {
    state.cookie = cookieDe('u_manager')
    await expect(exigirAcessoPagina({ perfis: ['PRODUCTION_MANAGER'] })).resolves.toMatchObject({
      id: 'u_manager',
    })
  })

  it('bloqueia Vendedor em ação da Expedição', async () => {
    state.cookie = cookieDe('u_seller')
    await expect(exigirAcessoPagina({ acoes: ['registrar_entrega'] })).rejects.toThrow(
      'REDIRECT:/vendedor/pedidos',
    )
  })

  it('permite Expedição em ação da Expedição', async () => {
    state.cookie = cookieDe('u_shipping')
    await expect(exigirAcessoPagina({ acoes: ['registrar_entrega'] })).resolves.toMatchObject({
      id: 'u_shipping',
    })
  })

  it('bloqueia Vendedor no painel e nas ocorrências da Gerência', async () => {
    state.cookie = cookieDe('u_seller')
    await expect(
      exigirAcessoPagina({ acoes: ['consultar_atividades_gerente'] }),
    ).rejects.toThrow('REDIRECT:/vendedor/pedidos')
  })
})
