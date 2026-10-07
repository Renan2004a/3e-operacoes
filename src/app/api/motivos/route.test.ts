import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleCode } from '@/generated/prisma/client'
import { assinarSessao } from '../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'
import type { OcorrenciasRepository } from '../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import type { MotivoOcorrencia } from '../../../modules/ocorrencias/motivos'

const holder = vi.hoisted(() => ({
  repo: null as unknown as OcorrenciasRepository,
  perfis: {} as Record<string, RoleCode[]>,
}))

vi.mock('../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository', () => ({
  prismaOcorrenciasRepository: {
    listarMotivosPorTipo: (tipo: Parameters<OcorrenciasRepository['listarMotivosPorTipo']>[0]) =>
      holder.repo.listarMotivosPorTipo(tipo),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(holder.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

const motivos: MotivoOcorrencia[] = []

holder.repo = {
  async listarMotivosPorTipo(tipo) {
    return motivos.filter((motivo) => motivo.tipo === tipo)
  },
} as OcorrenciasRepository

function seedMotivo(overrides: Partial<MotivoOcorrencia> & Pick<MotivoOcorrencia, 'id'>) {
  motivos.push({
    id: overrides.id,
    tipo: overrides.tipo ?? 'PERDA',
    codigo: overrides.codigo ?? overrides.id,
    descricao: overrides.descricao ?? 'Motivo',
    ativo: overrides.ativo ?? true,
  })
}

function request(url: string, opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_op' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request(url, { headers })
}

describe('GET /api/motivos', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    motivos.length = 0
    holder.perfis.user_op = ['OPERATOR']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 com apenas os motivos ativos do tipo (OCO-08)', async () => {
    seedMotivo({ id: 'perda_ativa', tipo: 'PERDA', codigo: 'DEFEITO_CORTE' })
    seedMotivo({ id: 'perda_inativa', tipo: 'PERDA', ativo: false })
    seedMotivo({ id: 'refugo_ativa', tipo: 'REFUGO' })

    const response = await GET(request('http://localhost/api/motivos?tipo=PERDA'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.motivos).toHaveLength(1)
    expect(body.motivos[0].codigo).toBe('DEFEITO_CORTE')
  })

  it('responde 400 para tipo inválido', async () => {
    const response = await GET(request('http://localhost/api/motivos?tipo=INEXISTENTE'))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_tipo')
  })

  it('responde 400 quando o tipo não é informado', async () => {
    const response = await GET(request('http://localhost/api/motivos'))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_tipo')
  })

  it('responde 401 quando a sessão está ausente', async () => {
    const response = await GET(
      request('http://localhost/api/motivos?tipo=PERDA', { usuarioId: null }),
    )

    expect(response.status).toBe(401)
  })

  it('responde 200 com lista vazia quando não há motivos do tipo (OCO-08)', async () => {
    const response = await GET(request('http://localhost/api/motivos?tipo=PAUSA'))

    expect(response.status).toBe(200)
    expect((await response.json()).motivos).toEqual([])
  })
})
