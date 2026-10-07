import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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
  }

  return { sectors, repo, reset }
})

vi.mock('../../../modules/setores/adapters/prisma-setores-repository', () => ({
  prismaSectorRepository: mocks.repo,
}))

import { GET, POST } from './route'

function request(
  method: 'GET' | 'POST',
  body?: unknown,
  token: string | null = 'segredo-interno',
): Request {
  return new Request('http://localhost/api/setores', {
    method,
    headers:
      token === null
        ? { 'content-type': 'application/json' }
        : { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

describe('/api/setores', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    mocks.reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
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

  it('responde 401 na listagem sem token', async () => {
    const response = await GET(request('GET', undefined, null))

    expect(response.status).toBe(401)
  })

  it('responde 401 na criação sem token e não persiste', async () => {
    const response = await POST(request('POST', { code: 'TELHAS', name: 'Telhas' }, null))

    expect(response.status).toBe(401)
    expect(mocks.sectors).toHaveLength(0)
  })
})
