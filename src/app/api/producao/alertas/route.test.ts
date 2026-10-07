import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import type { AtividadeComPrazo } from '../../../../modules/prazos/alertas'

const PASSADO = new Date(Date.now() - 86_400_000)
const FUTURO = new Date(Date.now() + 86_400_000)

const mocks = vi.hoisted(() => {
  const atividades: Array<{
    id: string
    orderItemId: string
    sectorId: string
    status: string
    deadlineAt: Date | null
  }> = []
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    listarAtividadesComPrazo: async () => atividades.map((atividade) => ({ ...atividade })),
  }

  function atividade(
    overrides: Partial<AtividadeComPrazo> & Pick<AtividadeComPrazo, 'id'>,
  ): AtividadeComPrazo {
    return {
      orderItemId: `item_${overrides.id}`,
      sectorId: 'setor_telhas',
      status: 'IN_PROGRESS',
      deadlineAt: null,
      ...overrides,
    }
  }

  function reset() {
    atividades.length = 0
  }

  return { atividades, perfis, repo, atividade, reset }
})

vi.mock('../../../../modules/prazos/adapters/prisma-prazos-repository', () => ({
  prismaPrazosRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(mocks.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

function request(opts: { usuarioId?: string | null } = {}): Request {
  const { usuarioId = 'user_mgr' } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/producao/alertas', { method: 'GET', headers })
}

describe('GET /api/producao/alertas', () => {
  const original = process.env.SESSION_SECRET

  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_mgr = ['PRODUCTION_MANAGER']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = original
  })

  it('responde 200 com apenas as atividades atrasadas (PRAZO-10)', async () => {
    mocks.atividades.push(
      mocks.atividade({ id: 'act_atrasada', deadlineAt: PASSADO }),
      mocks.atividade({ id: 'act_futura', deadlineAt: FUTURO }),
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.alertas.map((alerta: { id: string }) => alerta.id)).toEqual(['act_atrasada'])
  })

  it('não inclui atividade concluída mesmo com prazo ultrapassado (PRAZO-10)', async () => {
    mocks.atividades.push(
      mocks.atividade({ id: 'act_concluida', deadlineAt: PASSADO, status: 'COMPLETED' }),
      mocks.atividade({ id: 'act_atrasada', deadlineAt: PASSADO }),
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.alertas.map((alerta: { id: string }) => alerta.id)).toEqual(['act_atrasada'])
  })

  it('não inclui atividade sem prazo (PRAZO-10)', async () => {
    mocks.atividades.push(
      mocks.atividade({ id: 'act_sem_prazo', deadlineAt: null }),
      mocks.atividade({ id: 'act_atrasada', deadlineAt: PASSADO }),
    )

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.alertas.map((alerta: { id: string }) => alerta.id)).toEqual(['act_atrasada'])
  })

  it('responde 200 com lista vazia quando não há atrasos (PRAZO-10)', async () => {
    mocks.atividades.push(mocks.atividade({ id: 'act_futura', deadlineAt: FUTURO }))

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.alertas).toEqual([])
  })

  it('responde 401 sem sessão (AUTH-14)', async () => {
    const response = await GET(request({ usuarioId: null }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })
})
