import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../modules/auth/sessao'
import type { PedidoConsultado } from '../../../modules/indicadores/consulta-pedidos'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const pedidos: PedidoConsultado[] = []
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    listarPedidosParaConsulta: async () =>
      pedidos.map((pedido) => ({
        ...pedido,
        atividades: pedido.atividades.map((atividade) => ({ ...atividade })),
      })),
  }

  const usuariosRepo = {
    findById: async (id: string) => ({ id, roles: [...(perfis[id] ?? [])] }),
  }

  function reset() {
    pedidos.length = 0
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return { pedidos, perfis, repo, usuariosRepo, reset }
})

vi.mock('../../../modules/indicadores/adapters/prisma-indicadores-repository', () => ({
  prismaIndicadoresRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: mocks.usuariosRepo,
}))

import { GET } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function pedido(
  id: string,
  numero: string,
  cliente: string | null,
  status: PedidoConsultado['atividades'][number]['status'],
): PedidoConsultado {
  return {
    id,
    numero,
    cliente,
    criadoEm: new Date('2026-10-07T12:00:00.000Z'),
    atividades: [{ sectorId: 'setor_telhas', status }],
  }
}

function request(
  opts: { userId?: string | null; xUserId?: string | null; query?: string } = {},
): Request {
  const { userId = 'user_vendedor', xUserId = null, query = '' } = opts
  const headers: Record<string, string> = {}
  if (userId) {
    const token = assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request(`http://localhost/api/pedidos${query}`, { method: 'GET', headers })
}

describe('GET /api/pedidos', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_vendedor = ['SELLER']
    mocks.perfis.user_sem_perfil = []
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 com número, cliente e status (IND-01)', async () => {
    mocks.pedidos.push(pedido('ped_1', '1001', 'Construtora X', 'COMPLETED'))

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pedidos).toHaveLength(1)
    expect(body.pedidos[0]).toEqual({
      id: 'ped_1',
      numero: '1001',
      cliente: 'Construtora X',
      status: 'COMPLETED',
    })
  })

  it('aplica os filtros de cliente e status para o vendedor (IND-02, IND-03)', async () => {
    mocks.pedidos.push(
      pedido('ped_1', '1001', 'Construtora X', 'COMPLETED'),
      pedido('ped_2', '1002', 'Mercado Y', 'PENDING'),
    )

    const response = await GET(request({ query: '?cliente=construtora&status=COMPLETED' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pedidos.map((linha: { id: string }) => linha.id)).toEqual(['ped_1'])
  })

  it('responde 400 com filtro inválido e não consulta (IND-02)', async () => {
    mocks.pedidos.push(pedido('ped_1', '1001', 'Construtora X', 'COMPLETED'))

    const status = await GET(request({ query: '?status=INVALIDO' }))
    expect(status.status).toBe(400)
    expect((await status.json()).error).toBe('invalid_filters')

    const limite = await GET(request({ query: '?limite=-1' }))
    expect(limite.status).toBe(400)
  })

  it('responde 401 sem sessão (IND-11)', async () => {
    const response = await GET(request({ userId: null }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('ignora o cabeçalho x-user-id quando não há sessão (IND-11)', async () => {
    const response = await GET(request({ userId: null, xUserId: 'user_vendedor' }))

    expect(response.status).toBe(401)
  })

  it('responde 403 quando o usuário não tem perfil (IND-11)', async () => {
    const response = await GET(request({ userId: 'user_sem_perfil' }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })

  describe('filtro de período por dia em America/Sao_Paulo (AD-014)', () => {
    function pedidoCriadoEm(id: string, numero: string, criadoEm: string): PedidoConsultado {
      return { ...pedido(id, numero, 'Cliente', 'PENDING'), criadoEm: new Date(criadoEm) }
    }

    async function numerosDoPeriodo(query: string, userId = 'user_vendedor') {
      const response = await GET(request({ userId, query: `?${query}` }))
      expect(response.status).toBe(200)
      const body = await response.json()
      return body.pedidos.map((linha: { numero: string }) => linha.numero)
    }

    it('inclui pedido criado às 23h30 de São Paulo no filtro do próprio dia', async () => {
      mocks.pedidos.push(pedidoCriadoEm('ped_1', '2001', '2026-10-23T02:30:00.000Z'))

      expect(await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22')).toEqual(['2001'])
    })

    it('com início e fim iguais, retorna o dia inteiro', async () => {
      mocks.pedidos.push(
        pedidoCriadoEm('ped_antes', '2001', '2026-10-22T02:59:59.999Z'),
        pedidoCriadoEm('ped_inicio', '2002', '2026-10-22T03:00:00.000Z'),
        pedidoCriadoEm('ped_fim', '2003', '2026-10-23T02:59:59.999Z'),
        pedidoCriadoEm('ped_depois', '2004', '2026-10-23T03:00:00.000Z'),
      )

      expect((await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22')).sort()).toEqual([
        '2002',
        '2003',
      ])
    })

    it('exclui pedidos anteriores ao início e posteriores ao fim do período', async () => {
      mocks.pedidos.push(
        pedidoCriadoEm('ped_antes', '2001', '2026-10-21T23:59:59.999-03:00'),
        pedidoCriadoEm('ped_dentro', '2002', '2026-10-22T10:00:00.000-03:00'),
        pedidoCriadoEm('ped_depois', '2003', '2026-10-23T00:00:00.000-03:00'),
      )

      expect(await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22')).toEqual(['2002'])
    })

    it('filtra um intervalo de dias incluindo o último dia inteiro', async () => {
      mocks.pedidos.push(
        pedidoCriadoEm('ped_1', '2001', '2026-10-21T12:00:00.000-03:00'),
        pedidoCriadoEm('ped_2', '2002', '2026-10-31T21:00:00.000-03:00'),
        pedidoCriadoEm('ped_3', '2003', '2026-11-01T00:30:00.000-03:00'),
      )

      expect((await numerosDoPeriodo('de=2026-10-22&ate=2026-10-31')).sort()).toEqual(['2002'])
    })

    it('mantém o filtro para o Gerente', async () => {
      mocks.perfis.user_gerente = ['PRODUCTION_MANAGER']
      mocks.pedidos.push(pedidoCriadoEm('ped_1', '2001', '2026-10-23T02:30:00.000Z'))

      expect(await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22', 'user_gerente')).toEqual([
        '2001',
      ])
    })

    it('responde 400 para data que não existe no calendário', async () => {
      const response = await GET(request({ query: '?de=2026-02-30' }))

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('invalid_filters')
    })
  })
})
