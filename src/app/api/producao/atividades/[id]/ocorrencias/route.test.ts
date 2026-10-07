import { Prisma } from '@/generated/prisma/client'
import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../../shared/http/auth-context'
import type { OcorrenciasRepository } from '../../../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import type { OcorrenciaListada } from '../../../../../../modules/ocorrencias/listar-ocorrencias'
import type { MotivoOcorrencia } from '../../../../../../modules/ocorrencias/motivos'
import type { Ocorrencia } from '../../../../../../modules/ocorrencias/registrar-ocorrencia'

const holder = vi.hoisted(() => ({
  repo: null as unknown as OcorrenciasRepository,
  perfis: {} as Record<string, RoleCode[]>,
}))

vi.mock('../../../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository', () => ({
  prismaOcorrenciasRepository: {
    listarMotivosPorTipo: (tipo: Parameters<OcorrenciasRepository['listarMotivosPorTipo']>[0]) =>
      holder.repo.listarMotivosPorTipo(tipo),
    buscarMotivoPorId: (motivoId: string) => holder.repo.buscarMotivoPorId(motivoId),
    buscarAtividadeParaOcorrencia: (atividadeId: string) =>
      holder.repo.buscarAtividadeParaOcorrencia(atividadeId),
    usuarioPertenceAoSetor: (usuarioId: string, sectorId: string) =>
      holder.repo.usuarioPertenceAoSetor(usuarioId, sectorId),
    registrarOcorrencia: (input: Parameters<OcorrenciasRepository['registrarOcorrencia']>[0]) =>
      holder.repo.registrarOcorrencia(input),
    listarOcorrencias: (atividadeId: string) => holder.repo.listarOcorrencias(atividadeId),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(holder.perfis[id] ?? [])] }),
  },
}))

import { GET, POST } from './route'

const NOW = new Date('2026-10-07T12:00:00.000Z')

interface AtividadeRow {
  id: string
  sectorId: string
  unidade: string
}

const state = {
  atividades: [] as AtividadeRow[],
  motivos: [] as MotivoOcorrencia[],
  vinculos: new Set<string>(),
  ocorrencias: [] as Ocorrencia[],
  seq: 0,
}

holder.repo = {
  async listarMotivosPorTipo(tipo) {
    return state.motivos.filter((motivo) => motivo.tipo === tipo)
  },
  async buscarMotivoPorId(motivoId) {
    return state.motivos.find((motivo) => motivo.id === motivoId) ?? null
  },
  async buscarAtividadeParaOcorrencia(atividadeId) {
    const found = state.atividades.find((atividade) => atividade.id === atividadeId)
    return found ? { ...found } : null
  },
  async usuarioPertenceAoSetor(usuarioId, sectorId) {
    return state.vinculos.has(`${usuarioId}:${sectorId}`)
  },
  async registrarOcorrencia(input) {
    state.seq += 1
    const ocorrencia: Ocorrencia = {
      id: `oco_${state.seq}`,
      activityId: input.atividadeId,
      userId: input.usuarioId,
      tipo: input.tipo,
      quantidade: input.quantidade,
      duracaoMin: input.duracaoMin,
      motivoId: input.motivoId,
      observacao: input.observacao,
      occurredAt: input.occurredAt,
    }
    state.ocorrencias.push(ocorrencia)
    return ocorrencia
  },
  async listarOcorrencias(atividadeId): Promise<OcorrenciaListada[]> {
    return state.ocorrencias
      .filter((ocorrencia) => ocorrencia.activityId === atividadeId)
      .map((ocorrencia) => ({
        id: ocorrencia.id,
        tipo: ocorrencia.tipo,
        quantidade: ocorrencia.quantidade,
        duracaoMin: ocorrencia.duracaoMin,
        motivo: ocorrencia.motivoId
          ? (state.motivos.find((motivo) => motivo.id === ocorrencia.motivoId) ?? null)
          : null,
        observacao: ocorrencia.observacao,
        occurredAt: ocorrencia.occurredAt,
      }))
  },
}

function reset() {
  state.atividades.length = 0
  state.motivos.length = 0
  state.vinculos.clear()
  state.ocorrencias.length = 0
  state.seq = 0
}

function seedAtividade(id: string, opts: { sectorId?: string; unidade?: string } = {}) {
  state.atividades.push({
    id,
    sectorId: opts.sectorId ?? 'setor_corte',
    unidade: opts.unidade ?? 'UN',
  })
}

function seedMotivo(id: string, tipo: MotivoOcorrencia['tipo']) {
  state.motivos.push({ id, tipo, codigo: id, descricao: 'Motivo', ativo: true })
}

function postRequest(
  body: unknown,
  opts: { usuarioId?: string | null; xUserId?: string | null } = {},
): Request {
  const { usuarioId = 'user_1', xUserId = null } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request('http://localhost/api/producao/atividades/act_1/ocorrencias', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function getRequest(opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_1' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/producao/atividades/act_1/ocorrencias', { headers })
}

function context(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('/api/producao/atividades/[id]/ocorrencias', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    reset()
    holder.perfis.user_1 = ['OPERATOR']
    holder.perfis.user_2 = ['OPERATOR']
    holder.perfis.user_vendedor = ['SELLER']
    state.vinculos.add('user_1:setor_corte')
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 201 e registra a perda com usuário e motivo (OCO-01)', async () => {
    seedAtividade('act_1')
    seedMotivo('m_perda', 'PERDA')

    const response = await POST(
      postRequest({ tipo: 'PERDA', quantidade: '2', motivoId: 'm_perda' }, { xUserId: 'user_outro' }),
      context('act_1'),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.ocorrencia.userId).toBe('user_1')
    expect(body.ocorrencia.tipo).toBe('PERDA')
    expect(body.ocorrencia.quantidade).toBe('2')
    expect(body.ocorrencia.motivoId).toBe('m_perda')
    expect(state.ocorrencias).toHaveLength(1)
  })

  it('responde 400 quando perda/refugo/indisponibilidade não têm motivo (OCO-02)', async () => {
    seedAtividade('act_1')

    for (const tipo of ['PERDA', 'REFUGO', 'INDISPONIBILIDADE']) {
      const response = await POST(
        postRequest({ tipo, quantidade: '2' }),
        context('act_1'),
      )
      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('motivo_required')
    }
    expect(state.ocorrencias).toHaveLength(0)
  })

  it('responde 400 para motivo inválido (OCO-03)', async () => {
    seedAtividade('act_1')

    const response = await POST(
      postRequest({ tipo: 'PERDA', quantidade: '2', motivoId: 'nao_existe' }),
      context('act_1'),
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_motivo')
    expect(state.ocorrencias).toHaveLength(0)
  })

  it('responde 400 para quantidade fora da unidade (OCO-04)', async () => {
    seedAtividade('act_1', { unidade: 'UN' })
    seedMotivo('m_perda', 'PERDA')

    const response = await POST(
      postRequest({ tipo: 'PERDA', quantidade: '2.5', motivoId: 'm_perda' }),
      context('act_1'),
    )

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_quantity')
    expect(state.ocorrencias).toHaveLength(0)
  })

  it('responde 400 para tipo de ocorrência desconhecido', async () => {
    seedAtividade('act_1')

    const response = await POST(postRequest({ tipo: 'INEXISTENTE' }), context('act_1'))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_body')
  })

  it('responde 403 quando o operador não pertence ao setor (OCO-11)', async () => {
    seedAtividade('act_1', { sectorId: 'setor_corte' })

    const response = await POST(
      postRequest({ tipo: 'PERDA', quantidade: '2', motivoId: 'm_perda' }, { usuarioId: 'user_2' }),
      context('act_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('operator_outside_sector')
    expect(state.ocorrencias).toHaveLength(0)
  })

  it('responde 404 quando a atividade não existe (OCO-10)', async () => {
    const response = await POST(
      postRequest({ tipo: 'PERDA', quantidade: '2', motivoId: 'm_perda' }),
      context('act_x'),
    )

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('activity_not_found')
  })

  it('responde 200 com tipo, quantidade, motivo e data/hora (OCO-07)', async () => {
    seedAtividade('act_1')
    seedMotivo('m_perda', 'PERDA')
    state.ocorrencias.push({
      id: 'oco_1',
      activityId: 'act_1',
      userId: 'user_1',
      tipo: 'PERDA',
      quantidade: new Prisma.Decimal(2),
      duracaoMin: null,
      motivoId: 'm_perda',
      observacao: 'trincada',
      occurredAt: NOW,
    })

    const response = await GET(getRequest(), context('act_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ocorrencias).toHaveLength(1)
    expect(body.ocorrencias[0].tipo).toBe('PERDA')
    expect(body.ocorrencias[0].quantidade).toBe('2')
    expect(body.ocorrencias[0].motivo.descricao).toBe('Motivo')
    expect(body.ocorrencias[0].observacao).toBe('trincada')
  })

  it('responde 404 ao listar ocorrências de atividade inexistente (OCO-10)', async () => {
    const response = await GET(getRequest(), context('act_x'))

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('activity_not_found')
  })

  it('responde 403 quando o perfil não pode registrar ocorrência (AUTH-14)', async () => {
    seedAtividade('act_1')

    const response = await POST(
      postRequest(
        { tipo: 'PERDA', quantidade: '2', motivoId: 'm_perda' },
        { usuarioId: 'user_vendedor' },
      ),
      context('act_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(state.ocorrencias).toHaveLength(0)
  })

  it('responde 401 sem sessão no POST e no GET (AUTH-14)', async () => {
    const post = await POST(postRequest({ tipo: 'PERDA' }, { usuarioId: null }), context('act_1'))
    expect(post.status).toBe(401)

    const get = await GET(getRequest({ usuarioId: null }), context('act_1'))
    expect(get.status).toBe(401)
  })
})
