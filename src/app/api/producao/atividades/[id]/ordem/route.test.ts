import { Prisma } from '@/generated/prisma/client'
import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'
import type {
  DadosOrdemProducao,
  OrdemProducaoRepository,
} from '../../../../../../modules/producao/ordem-producao'

const holder = vi.hoisted(() => ({
  repo: null as unknown as OrdemProducaoRepository,
  perfis: {} as Record<string, RoleCode[]>,
}))

vi.mock('../../../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: {
    buscarOrdemProducao: (atividadeId: string) => holder.repo.buscarOrdemProducao(atividadeId),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(holder.perfis[id] ?? [])] }),
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

function request(opts: { usuarioId?: string | null; xUserId?: string | null } = {}): Request {
  const { usuarioId = 'user_1', xUserId = null } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request('http://localhost/api/producao/atividades/act_1/ordem', { headers })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('GET /api/producao/atividades/[id]/ordem', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    reset()
    holder.perfis.user_1 = ['OPERATOR']
    holder.perfis.user_sem_perfil = []
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
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

  it('responde 401 sem sessão (AUTH-14)', async () => {
    seedOrdem('act_1')

    const response = await GET(request({ usuarioId: null }), context('act_1'))

    expect(response.status).toBe(401)
  })

  it('ignora o cabeçalho x-user-id quando não há sessão (AUTH-14)', async () => {
    seedOrdem('act_1')

    const response = await GET(request({ usuarioId: null, xUserId: 'user_1' }), context('act_1'))

    expect(response.status).toBe(401)
  })

  it('responde 403 quando o perfil não pode consultar (AUTH-14)', async () => {
    seedOrdem('act_1')

    const response = await GET(request({ usuarioId: 'user_sem_perfil' }), context('act_1'))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })
})
