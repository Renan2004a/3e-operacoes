import { Prisma } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExecucaoRepository } from '../../../../../../modules/producao/registrar-execucao'

const holder = vi.hoisted(() => ({
  repo: null as unknown as ExecucaoRepository,
}))

vi.mock('../../../../../../modules/producao/adapters/prisma-producao-repository', () => ({
  prismaProducaoRepository: {
    buscarAtividadeParaExecucao: (atividadeId: string) =>
      holder.repo.buscarAtividadeParaExecucao(atividadeId),
    usuarioPertenceAoSetor: (usuarioId: string, sectorId: string) =>
      holder.repo.usuarioPertenceAoSetor(usuarioId, sectorId),
    registrarExecucao: (input: Parameters<ExecucaoRepository['registrarExecucao']>[0]) =>
      holder.repo.registrarExecucao(input),
  },
}))

import { POST } from './route'

interface AtividadeRow {
  id: string
  sectorId: string
  unidade: string
  solicitado: Prisma.Decimal
}

interface ExecucaoRow {
  id: string
  activityId: string
  userId: string
  quantidade: Prisma.Decimal
  occurredAt: Date
}

const state = {
  atividades: [] as AtividadeRow[],
  vinculos: new Set<string>(),
  execucoes: [] as ExecucaoRow[],
  seq: 0,
}

holder.repo = {
  async buscarAtividadeParaExecucao(atividadeId) {
    const found = state.atividades.find((candidate) => candidate.id === atividadeId)
    return found ? { ...found } : null
  },
  async usuarioPertenceAoSetor(usuarioId, sectorId) {
    return state.vinculos.has(`${usuarioId}:${sectorId}`)
  },
  async registrarExecucao({ atividadeId, usuarioId, quantidade, occurredAt, resolverStatus }) {
    const anteriores = state.execucoes.filter((execucao) => execucao.activityId === atividadeId)
    const executadoTotal = anteriores.reduce(
      (total, execucao) => total.plus(execucao.quantidade),
      quantidade,
    )
    const status = resolverStatus(executadoTotal)
    state.seq += 1
    const execucao = {
      id: `exec_${state.seq}`,
      activityId: atividadeId,
      userId: usuarioId,
      quantidade,
      occurredAt,
    }
    state.execucoes.push(execucao)
    return { execucao, executadoTotal, status }
  },
}

function reset() {
  state.atividades.length = 0
  state.vinculos.clear()
  state.execucoes.length = 0
  state.seq = 0
}

function seedAtividade(
  id: string,
  opts: { sectorId?: string; unidade?: string; solicitado?: number } = {},
) {
  state.atividades.push({
    id,
    sectorId: opts.sectorId ?? 'setor_telhas',
    unidade: opts.unidade ?? 'M',
    solicitado: new Prisma.Decimal(opts.solicitado ?? 10),
  })
}

function request(
  body: unknown,
  opts: { usuarioId?: string | null; token?: string | null } = {},
): Request {
  const { usuarioId = 'user_1', token = 'segredo-interno' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token !== null) headers.authorization = `Bearer ${token}`
  if (usuarioId !== null) headers['x-user-id'] = usuarioId
  return new Request('http://localhost/api/producao/atividades/act_1/execucoes', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('POST /api/producao/atividades/[id]/execucoes', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    reset()
    state.vinculos.add('user_1:setor_telhas')
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 201 e persiste a execução com usuário e status', async () => {
    seedAtividade('act_1', { solicitado: 10 })

    const response = await POST(request({ quantidade: '4' }), context('act_1'))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.execucao.userId).toBe('user_1')
    expect(body.status).toBe('IN_PROGRESS')
    expect(body.saldo.pendente).toBe('6')
    expect(state.execucoes).toHaveLength(1)
    expect(state.execucoes[0].userId).toBe('user_1')
  })

  it('responde 400 para quantidade fracionária em peça e não persiste', async () => {
    seedAtividade('act_1', { unidade: 'UN' })

    const response = await POST(request({ quantidade: '2.5' }), context('act_1'))

    expect(response.status).toBe(400)
    expect(state.execucoes).toHaveLength(0)
  })

  it('responde 400 quando a quantidade está ausente e não persiste', async () => {
    seedAtividade('act_1')

    const response = await POST(request({}), context('act_1'))

    expect(response.status).toBe(400)
    expect(state.execucoes).toHaveLength(0)
  })

  it('responde 403 quando o operador não pertence ao setor da atividade', async () => {
    seedAtividade('act_1', { sectorId: 'setor_telhas' })

    const response = await POST(
      request({ quantidade: '4' }, { usuarioId: 'user_2' }),
      context('act_1'),
    )

    expect(response.status).toBe(403)
    expect(state.execucoes).toHaveLength(0)
  })

  it('responde 404 quando a atividade não existe', async () => {
    const response = await POST(request({ quantidade: '4' }), context('act_x'))

    expect(response.status).toBe(404)
    expect(state.execucoes).toHaveLength(0)
  })

  it('responde 401 quando o token está ausente', async () => {
    seedAtividade('act_1')

    const response = await POST(request({ quantidade: '4' }, { token: null }), context('act_1'))

    expect(response.status).toBe(401)
    expect(state.execucoes).toHaveLength(0)
  })
})
