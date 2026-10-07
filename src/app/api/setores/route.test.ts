import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleCode } from '@/generated/prisma/client'
import { assinarSessao } from '../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const NOW = new Date('2026-10-07T12:00:00.000Z')
  const sectors: Array<{
    id: string
    code: string
    name: string
    active: boolean
    createdAt: Date
    updatedAt: Date
  }> = []
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    findByCode: async (code: string) => sectors.find((sector) => sector.code === code) ?? null,
    listActive: async () => sectors.filter((sector) => sector.active),
    create: async ({ code, name }: { code: string; name: string }) => {
      const created = {
        id: `sector_${sectors.length + 1}`,
        code,
        name,
        active: true,
        createdAt: NOW,
        updatedAt: NOW,
      }
      sectors.push(created)
      return { ...created }
    },
    deactivate: async (id: string) => {
      const found = sectors.find((sector) => sector.id === id)
      if (!found) throw new Error('setor não encontrado')
      found.active = false
      return { ...found }
    },
  }

  function reset() {
    sectors.length = 0
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return { sectors, repo, reset, perfis }
})

vi.mock('../../../modules/setores/adapters/prisma-setores-repository', () => ({
  prismaSectorRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET, POST } from './route'

function request(
  method: 'GET' | 'POST',
  body?: unknown,
  opts: { usuarioId?: string | null } = {},
): Request {
  const { usuarioId = 'user_admin' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/setores', {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('/api/setores', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_admin = ['SYSTEM_RESPONSIBLE']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 listando apenas setores ativos', async () => {
    mocks.sectors.push(
      {
        id: 'sector_1',
        code: 'TELHAS',
        name: 'Telhas',
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'sector_2',
        code: 'REVENDA',
        name: 'Revenda',
        active: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    )

    const response = await GET(request('GET'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.sectors.map((sector: { code: string }) => sector.code)).toEqual(['TELHAS'])
  })

  it('responde 201 ao criar um setor ativo', async () => {
    const response = await POST(request('POST', { code: 'TELHAS', name: 'Telhas' }))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.sector).toMatchObject({ code: 'TELHAS', name: 'Telhas', active: true })
    expect(mocks.sectors).toHaveLength(1)
  })

  it('responde 409 ao criar setor com código já existente', async () => {
    mocks.sectors.push({
      id: 'sector_1',
      code: 'TELHAS',
      name: 'Telhas',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const response = await POST(request('POST', { code: 'TELHAS', name: 'Telhas' }))

    expect(response.status).toBe(409)
    expect(mocks.sectors).toHaveLength(1)
  })

  it('responde 400 ao criar setor com código vazio', async () => {
    const response = await POST(request('POST', { code: '   ', name: 'Telhas' }))

    expect(response.status).toBe(400)
    expect(mocks.sectors).toHaveLength(0)
  })

  it('responde 401 na listagem sem sessão', async () => {
    const response = await GET(request('GET', undefined, { usuarioId: null }))

    expect(response.status).toBe(401)
  })

  it('responde 403 na criação sem perfil autorizado e não persiste', async () => {
    mocks.perfis.user_vendedor = ['SELLER']

    const response = await POST(
      request('POST', { code: 'TELHAS', name: 'Telhas' }, { usuarioId: 'user_vendedor' }),
    )

    expect(response.status).toBe(403)
    expect(mocks.sectors).toHaveLength(0)
  })
})
