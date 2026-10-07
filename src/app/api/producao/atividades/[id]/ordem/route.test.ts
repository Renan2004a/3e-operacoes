import { Prisma } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  DadosOrdemProducao,
  OrdemProducaoRepository,
} from '../../../../../../modules/producao/ordem-producao'

const holder = vi.hoisted(() => ({
  repo: null as unknown as OrdemProducaoRepository,
}))

vi.mock('../../../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: {
    buscarOrdemProducao: (atividadeId: string) => holder.repo.buscarOrdemProducao(atividadeId),
  },
}))

import { GET } from './route'

const store: DadosOrdemProducao[] = []

holder.repo = {
  async buscarOrdemProducao(atividadeId) {
    const found = store.find((candidate) => candidate.atividadeId === atividadeId)
    return found ? { ...found } : null
  },
}

function reset() {
  store.length = 0
}

function seedOrdem(
  atividadeId: string,
  opts: { pedido?: string; item?: string; setor?: string; solicitado?: number; executado?: number } = {},
) {
  store.push({
    atividadeId,
    pedido: opts.pedido ?? '70435',
    item: opts.item ?? 'TELHA ONDULADA',
    setor: opts.setor ?? 'Telhas',
    unidade: 'M',
    solicitado: new Prisma.Decimal(opts.solicitado ?? 10),
    executado: new Prisma.Decimal(opts.executado ?? 8),
  })
}

function request(token: string | null = 'segredo-interno'): Request {
  return new Request('http://localhost/api/producao/atividades/act_1/ordem', {
    headers: token === null ? {} : { authorization: `Bearer ${token}` },
  })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/producao/atividades/[id]/ordem', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 200 com pedido, item e setor', async () => {
    seedOrdem('act_1')

    const response = await GET(request(), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ordem.pedido).toBe('70435')
    expect(body.ordem.item).toBe('TELHA ONDULADA')
    expect(body.ordem.setor).toBe('Telhas')
  })

  it('responde 200 com solicitado, executado e pendente', async () => {
    seedOrdem('act_1', { solicitado: 10, executado: 8 })

    const response = await GET(request(), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ordem.solicitado).toBe('10')
    expect(body.ordem.executado).toBe('8')
    expect(body.ordem.pendente).toBe('2')
  })

  it('responde 200 com pendente zero quando o executado ultrapassa o solicitado', async () => {
    seedOrdem('act_1', { solicitado: 10, executado: 13 })

    const response = await GET(request(), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ordem.pendente).toBe('0')
  })

  it('responde 404 quando a atividade não existe', async () => {
    const response = await GET(request(), context('act_x'))

    expect(response.status).toBe(404)
  })

  it('responde 401 quando o token está ausente', async () => {
    seedOrdem('act_1')

    const response = await GET(request(null), context('act_1'))

    expect(response.status).toBe(401)
  })
})
