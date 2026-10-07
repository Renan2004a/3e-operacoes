import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { OcorrenciasRepository } from '../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import type { MotivoOcorrencia } from '../../../modules/ocorrencias/motivos'

const holder = vi.hoisted(() => ({
  repo: null as unknown as OcorrenciasRepository,
}))

vi.mock('../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository', () => ({
  prismaOcorrenciasRepository: {
    listarMotivosPorTipo: (tipo: Parameters<OcorrenciasRepository['listarMotivosPorTipo']>[0]) =>
      holder.repo.listarMotivosPorTipo(tipo),
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

function request(url: string, token: string | null = 'segredo-interno'): Request {
  const headers: Record<string, string> = {}
  if (token !== null) headers.authorization = `Bearer ${token}`
  return new Request(url, { headers })
}

describe('GET /api/motivos', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    motivos.length = 0
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
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

  it('responde 401 quando o token está ausente', async () => {
    const response = await GET(request('http://localhost/api/motivos?tipo=PERDA', null))

    expect(response.status).toBe(401)
  })

  it('responde 200 com lista vazia quando não há motivos do tipo (OCO-08)', async () => {
    const response = await GET(request('http://localhost/api/motivos?tipo=PAUSA'))

    expect(response.status).toBe(200)
    expect((await response.json()).motivos).toEqual([])
  })
})
