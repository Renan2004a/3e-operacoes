import type { RoleCode, UserStatus } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { hashSenha } from '../../../../modules/auth/senha'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  interface UsuarioRow {
    id: string
    name: string
    email: string
    status: UserStatus
    roles: RoleCode[]
    sectorIds: string[]
    createdAt: Date
    updatedAt: Date
  }

  const usuarios: UsuarioRow[] = []
  const hashes = new Map<string, string>()
  let seq = 0

  const usuariosRepo = {
    findByEmail: async (email: string) =>
      usuarios.find((usuario) => usuario.email === email) ?? null,
    findById: async (id: string) => usuarios.find((usuario) => usuario.id === id) ?? null,
    listar: async () => usuarios.map((usuario) => ({ ...usuario })),
    create: async (input: {
      name: string
      email: string
      passwordHash: string
      roles: RoleCode[]
      sectorIds: string[]
    }) => {
      seq += 1
      const now = new Date()
      const created: UsuarioRow = {
        id: `user_${seq}`,
        name: input.name,
        email: input.email,
        status: 'ACTIVE',
        roles: [...input.roles],
        sectorIds: [...input.sectorIds],
        createdAt: now,
        updatedAt: now,
      }
      usuarios.push(created)
      hashes.set(created.id, input.passwordHash)
      return { ...created }
    },
    update: async (
      id: string,
      input: {
        name?: string
        passwordHash?: string
        status?: UserStatus
        roles?: RoleCode[]
        sectorIds?: string[]
      },
    ) => {
      const found = usuarios.find((usuario) => usuario.id === id)
      if (!found) throw new Error('usuário não encontrado')
      if (input.name !== undefined) found.name = input.name
      if (input.status !== undefined) found.status = input.status
      if (input.roles !== undefined) found.roles = [...input.roles]
      if (input.sectorIds !== undefined) found.sectorIds = [...input.sectorIds]
      if (input.passwordHash !== undefined) hashes.set(id, input.passwordHash)
      found.updatedAt = new Date()
      return { ...found }
    },
    deactivate: async (id: string) => {
      const found = usuarios.find((usuario) => usuario.id === id)
      if (!found) throw new Error('usuário não encontrado')
      found.status = 'INACTIVE'
      return { ...found }
    },
  }

  const authRepo = {
    buscarPorEmail: async (email: string) => {
      const found = usuarios.find((usuario) => usuario.email === email)
      if (!found) return null
      return {
        id: found.id,
        email: found.email,
        passwordHash: hashes.get(found.id) ?? '',
        status: found.status,
        roles: [...found.roles],
      }
    },
  }

  function reset() {
    usuarios.length = 0
    hashes.clear()
    seq = 0
  }

  return { usuarios, hashes, usuariosRepo, authRepo, reset }
})

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: mocks.usuariosRepo,
}))

vi.mock('@/modules/auth/adapters/prisma-auth-repository', () => ({
  prismaAuthRepository: mocks.authRepo,
}))

import { POST as login } from '../../auth/login/route'
import { PATCH } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function seedUsuario(opts: {
  id: string
  email: string
  status?: UserStatus
  roles: RoleCode[]
}): void {
  const now = new Date('2026-10-07T12:00:00.000Z')
  mocks.usuarios.push({
    id: opts.id,
    name: opts.id,
    email: opts.email,
    status: opts.status ?? 'ACTIVE',
    roles: [...opts.roles],
    sectorIds: [],
    createdAt: now,
    updatedAt: now,
  })
}

function patchRequest(
  body: unknown,
  opts: { userId?: string | null } = {},
): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.userId) {
    const token = assinarSessao({ userId: opts.userId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/usuarios/user_alvo', {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body),
  })
}

function loginRequest(body: unknown): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PATCH /api/usuarios/[id]', () => {
  beforeEach(async () => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    seedUsuario({ id: 'user_admin', email: 'admin@example.com', roles: ['SYSTEM_RESPONSIBLE'] })
    seedUsuario({ id: 'user_alvo', email: 'alvo@example.com', roles: ['OPERATOR'] })
    seedUsuario({ id: 'user_vendedor', email: 'vendedor@example.com', roles: ['SELLER'] })
    // Hashes disponíveis para o login dos usuários semeados.
    mocks.hashes.set('user_admin', await hashSenha('senha-admin'))
    mocks.hashes.set('user_alvo', await hashSenha('senha-alvo'))
    mocks.hashes.set('user_vendedor', await hashSenha('senha-v'))
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 atualizando perfis e setores (AUTH-12)', async () => {
    const response = await PATCH(
      patchRequest(
        { roles: ['OPERATOR', 'SHIPPING'], sectorIds: ['setor_telhas', 'setor_corte'] },
        { userId: 'user_admin' },
      ),
      context('user_alvo'),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.usuario.roles).toEqual(['OPERATOR', 'SHIPPING'])
    expect(body.usuario.sectorIds).toEqual(['setor_telhas', 'setor_corte'])
  })

  it('responde 200 inativando o usuário (AUTH-13)', async () => {
    const response = await PATCH(
      patchRequest({ status: 'INACTIVE' }, { userId: 'user_admin' }),
      context('user_alvo'),
    )

    expect(response.status).toBe(200)
    expect((await response.json()).usuario.status).toBe('INACTIVE')
  })

  it('responde 404 quando o usuário não existe', async () => {
    const response = await PATCH(
      patchRequest({ name: 'Ninguém' }, { userId: 'user_admin' }),
      context('user_inexistente'),
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('user_not_found')
  })

  it('inativar impede o login do usuário (AUTH-13)', async () => {
    const antes = await login(loginRequest({ email: 'alvo@example.com', senha: 'senha-alvo' }))
    expect(antes.status).toBe(200)

    await PATCH(patchRequest({ status: 'INACTIVE' }, { userId: 'user_admin' }), context('user_alvo'))

    const depois = await login(loginRequest({ email: 'alvo@example.com', senha: 'senha-alvo' }))
    expect(depois.status).toBe(401)
  })

  it('responde 401 sem sessão e não altera o usuário', async () => {
    const response = await PATCH(patchRequest({ status: 'INACTIVE' }), context('user_alvo'))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
    expect(mocks.usuarios.find((usuario) => usuario.id === 'user_alvo')?.status).toBe('ACTIVE')
  })

  it('responde 403 quando o perfil não pode gerenciar usuários e não altera o usuário', async () => {
    const response = await PATCH(
      patchRequest({ status: 'INACTIVE' }, { userId: 'user_vendedor' }),
      context('user_alvo'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(mocks.usuarios.find((usuario) => usuario.id === 'user_alvo')?.status).toBe('ACTIVE')
  })
})
