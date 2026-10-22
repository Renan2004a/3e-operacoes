import { Prisma } from '@/generated/prisma/client'
import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import type { ConsultaPedidosRepository } from '../../../../modules/indicadores/consulta-pedidos'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'

interface ItemSeed {
  id: string
  solicitado: string
  executado: string
  entregue: string
  description?: string | null
  productCode?: string | null
  unit?: string
  deadlineAt?: Date | null
  activityDeadlineAt?: Date | null
}

const holder = vi.hoisted(() => ({
  pedidos: {} as Record<string, { numero: string; cliente: string | null; itens: ItemSeed[] }>,
  perfis: {} as Record<string, RoleCode[]>,
  repo: null as unknown as ConsultaPedidosRepository,
}))

vi.mock('../../../../modules/indicadores/adapters/prisma-indicadores-repository', () => ({
  prismaIndicadoresRepository: {
    buscarCabecalhoPedido: (orderId: string) => holder.repo.buscarCabecalhoPedido(orderId),
    buscarEspecificacoesDosItens: (orderId: string) =>
      holder.repo.buscarEspecificacoesDosItens(orderId),
    buscarItensDoPedido: (orderId: string) => holder.repo.buscarItensDoPedido(orderId),
    listarRegrasProdutoSetor: () => holder.repo.listarRegrasProdutoSetor(),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(holder.perfis[id] ?? [])] }),
  },
}))

import { GET } from './route'

holder.repo = {
  async consultarPedidos() {
    return { pedidos: [], total: 0 }
  },
  async buscarCabecalhoPedido(orderId) {
    const pedido = holder.pedidos[orderId]
    return pedido
      ? {
          id: orderId,
          numero: pedido.numero,
          cliente: pedido.cliente,
          customerName: pedido.cliente,
          sellerLegacyCode: null,
        }
      : null
  },
  async buscarEspecificacoesDosItens(orderId) {
    const pedido = holder.pedidos[orderId]
    if (!pedido) return []
    return pedido.itens.map((item) => ({
      itemId: item.id,
      description: item.description ?? null,
      productCode: item.productCode ?? null,
      unit: item.unit ?? 'un',
      deadlineAt: item.deadlineAt ?? null,
      activityDeadlineAt: item.activityDeadlineAt ?? null,
      classificationStatus: 'PENDING_CLASSIFICATION' as const,
    }))
  },
  async buscarItensDoPedido(orderId) {
    const pedido = holder.pedidos[orderId]
    if (!pedido) return null
    return pedido.itens.map((item) => ({
      id: item.id,
      solicitado: new Prisma.Decimal(item.solicitado),
      executado: new Prisma.Decimal(item.executado),
      entregue: new Prisma.Decimal(item.entregue),
    }))
  },
  async listarRegrasProdutoSetor() {
    return []
  },
}

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function seed(orderId: string, numero: string, cliente: string | null, itens: ItemSeed[]): void {
  holder.pedidos[orderId] = { numero, cliente, itens }
}

function item(id: string, solicitado: number, executado: number, entregue: number): ItemSeed {
  return {
    id,
    solicitado: String(solicitado),
    executado: String(executado),
    entregue: String(entregue),
  }
}

function request(opts: { userId?: string | null } = {}): Request {
  const { userId = 'user_vendedor' } = opts
  const headers: Record<string, string> = {}
  if (userId) {
    const token = assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  return new Request('http://localhost/api/pedidos/ped_1', { method: 'GET', headers })
}

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) }
}

describe('GET /api/pedidos/[orderId]', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    for (const key of Object.keys(holder.pedidos)) delete holder.pedidos[key]
    for (const key of Object.keys(holder.perfis)) delete holder.perfis[key]
    holder.perfis.user_vendedor = ['SELLER']
    holder.perfis.user_sem_perfil = []
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 com os cinco valores por item (IND-04)', async () => {
    seed('ped_1', '1001', 'Construtora X', [item('item_1', 10, 8, 3)])

    const response = await GET(request(), context('ped_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pedido.numero).toBe('1001')
    expect(body.pedido.cliente).toBe('Construtora X')
    expect(body.pedido.customerName).toBe('Construtora X')
    expect(body.pedido.sellerLegacyCode).toBeNull()
    expect(body.pedido.itens[0]).toEqual({
      itemId: 'item_1',
      solicitado: '10',
      executado: '8',
      disponivel: '5',
      entregue: '3',
      pendente: '2',
      description: null,
      productCode: null,
      unit: 'un',
      deadlineAt: null,
      activityDeadlineAt: null,
      classificationStatus: 'PENDING_CLASSIFICATION',
      sectorId: null,
      sectorCode: null,
      sectorName: null,
      activityStatus: null,
      suggestedSectorId: null,
      bloqueioCorrecaoSetor: null,
      remessas: [],
    })
  })

  it('devolve o prazo de entrega do item e o prazo operacional da atividade (AD-009)', async () => {
    const prazoEntrega = new Date('2026-02-02T02:59:59.999Z')
    const prazoSetor = new Date('2026-03-11T02:59:59.999Z')
    seed('ped_1', '1001', 'Construtora X', [
      { ...item('item_1', 10, 8, 3), deadlineAt: prazoEntrega, activityDeadlineAt: prazoSetor },
    ])

    const response = await GET(request(), context('ped_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pedido.itens[0].deadlineAt).toBe(prazoEntrega.toISOString())
    expect(body.pedido.itens[0].activityDeadlineAt).toBe(prazoSetor.toISOString())
  })

  it('responde 200 com os totais por unidade de medida, sem somar unidades diferentes (RN02)', async () => {
    seed('ped_1', '1001', 'Construtora X', [
      { ...item('item_1', 20, 0, 0), unit: 'peca' },
      { ...item('item_2', 15, 0, 0), unit: 'metro' },
      { ...item('item_3', 10, 0, 0), unit: 'peca' },
    ])

    const response = await GET(request(), context('ped_1'))

    const body = await response.json()
    expect(
      body.pedido.totaisPorUnidade.map(
        (total: { unidade: string; itens: number; solicitado: string }) => [
          total.unidade,
          total.itens,
          total.solicitado,
        ],
      ),
    ).toEqual([
      ['metro', 1, '15'],
      ['peca', 2, '30'],
    ])
  })

  it('responde 200 com lista vazia quando o pedido não tem itens (IND-04)', async () => {
    seed('ped_1', '1001', null, [])

    const response = await GET(request(), context('ped_1'))

    expect(response.status).toBe(200)
    expect((await response.json()).pedido.itens).toEqual([])
  })

  it('responde 404 quando o pedido não existe (IND-10)', async () => {
    const response = await GET(request(), context('ped_x'))

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('order_not_found')
  })

  it('responde 401 sem sessão (IND-11)', async () => {
    const response = await GET(request({ userId: null }), context('ped_1'))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('responde 403 quando o usuário não tem perfil (IND-11)', async () => {
    const response = await GET(request({ userId: 'user_sem_perfil' }), context('ped_1'))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })
})
