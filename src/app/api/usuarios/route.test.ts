import type { RoleCode, UserStatus } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../modules/auth/sessao'
import { verificarSenha } from '../../../modules/auth/senha'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

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

  const repo = {
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
    update: async (id: string, input: Partial<UsuarioRow>) => {
      const found = usuarios.find((usuario) => usuario.id === id)
      if (!found) throw new Error('usuário não encontrado')
      Object.assign(found, input)
      return { ...found }
    },
    deactivate: async (id: string) => {
      const found = usuarios.find((usuario) => usuario.id === id)
      if (!found) throw new Error('usuário não encontrado')
      found.status = 'INACTIVE'
      return { ...found }
    },
  }

  function reset() {
    usuarios.length = 0
    hashes.clear()
    seq = 0
  }

  return { usuarios, hashes, repo, reset }
})

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: mocks.repo,
}))

import { GET, POST } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function seedUsuario(opts: {
  id: string
  email: string
  roles: RoleCode[]
  sectorIds?: string[]
}): void {
  const now = new Date('2026-10-07T12:00:00.000Z')
  mocks.usuarios.push({
    id: opts.id,
    name: opts.id,
    email: opts.email,
    status: 'ACTIVE',
    roles: [...opts.roles],
    sectorIds: [...(opts.sectorIds ?? [])],
    createdAt: now,
    updatedAt: now,
  })
}

function request(
  method: 'GET' | 'POST',
  body?: unknown,
  opts: { userId?: string | null } = {},
): Request {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (opts.userId) {
    const token = assinarSessao({
      userId: opts.userId,
      expiraEm: new Date(Date.now() + 60_000),
    })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/usuarios', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('/api/usuarios', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    seedUsuario({ id: 'user_admin', email: 'admin@example.com', roles: ['SYSTEM_RESPONSIBLE'] })
    seedUsuario({ id: 'user_vendedor', email: 'vendedor@example.com', roles: ['SELLER'] })
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 201 criando o usuário com senha hasheada (AUTH-10)', async () => {
    const response = await POST(
      request(
        'POST',
        {
          name: 'Ana',
          email: 'ana@example.com',
          senha: 'senha-certa',
          roles: ['OPERATOR'],
          sectorIds: ['setor_telhas'],
        },
        { userId: 'user_admin' },
      ),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.usuario.email).toBe('ana@example.com')
    expect(body.usuario.roles).toEqual(['OPERATOR'])
    expect(body.usuario.sectorIds).toEqual(['setor_telhas'])

    const hash = mocks.hashes.get(body.usuario.id)
    expect(hash).not.toBe('senha-certa')
    await expect(verificarSenha('senha-certa', hash ?? '')).resolves.toBe(true)
  })

  it('responde 409 quando o email já existe (AUTH-11)', async () => {
    const response = await POST(
      request(
        'POST',
        { name: 'Outra', email: 'admin@example.com', senha: 'x' },
        { userId: 'user_admin' },
      ),
    )

    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('email_already_exists')
  })

  it('responde 400 com corpo inválido e não persiste', async () => {
    const response = await POST(request('POST', {}, { userId: 'user_admin' }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_body')
    expect(mocks.usuarios).toHaveLength(2)
  })

  it('responde 401 sem sessão no GET e no POST (AUTH-04)', async () => {
    const get = await GET(request('GET'))
    expect(get.status).toBe(401)
    expect((await get.json()).error).toBe('unauthorized')

    const post = await POST(request('POST', { name: 'Ana', email: 'a@b.com', senha: 'x' }))
    expect(post.status).toBe(401)
    expect(mocks.usuarios).toHaveLength(2)
  })

  it('responde 403 quando o perfil não pode gerenciar usuários (AUTH-07)', async () => {
    const get = await GET(request('GET', undefined, { userId: 'user_vendedor' }))
    expect(get.status).toBe(403)
    expect((await get.json()).error).toBe('forbidden')

    const post = await POST(
      request('POST', { name: 'Ana', email: 'a@b.com', senha: 'x' }, { userId: 'user_vendedor' }),
    )
    expect(post.status).toBe(403)
    expect(mocks.usuarios).toHaveLength(2)
  })

  it('GET responde 200 com a lista de usuários (AUTH-07)', async () => {
    const response = await GET(request('GET', undefined, { userId: 'user_admin' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.usuarios.map((usuario: { id: string }) => usuario.id)).toEqual([
      'user_admin',
      'user_vendedor',
    ])
  })
})
