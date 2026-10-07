import { Prisma } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  ItemDoPedido,
  SaldoPedidoRepository,
} from '../../../../../modules/expedicao/saldo-pedido'

const holder = vi.hoisted(() => ({
  repo: null as unknown as SaldoPedidoRepository,
}))

vi.mock('../../../../../modules/expedicao/adapters/prisma-expedicao-repository', () => ({
  prismaExpedicaoRepository: {
    buscarItensDoPedido: (orderId: string) => holder.repo.buscarItensDoPedido(orderId),
  },
}))

import { GET } from './route'

const pedidos: Record<string, ItemDoPedido[]> = {}

holder.repo = {
  async buscarItensDoPedido(orderId) {
    const found = pedidos[orderId]
    return found ? found.map((item) => ({ ...item })) : null
  },
}

function reset() {
  for (const key of Object.keys(pedidos)) delete pedidos[key]
}

function item(
  overrides: Partial<ItemDoPedido> & Pick<ItemDoPedido, 'id'>,
): ItemDoPedido {
  return {
    id: overrides.id,
    solicitado: overrides.solicitado ?? new Prisma.Decimal(10),
    executado: overrides.executado ?? new Prisma.Decimal(0),
    entregue: overrides.entregue ?? new Prisma.Decimal(0),
  }
}

function request(opts: { token?: string | null } = {}): Request {
  const { token = 'segredo-interno' } = opts
  const headers: Record<string, string> = {}
  if (token !== null) headers.authorization = `Bearer ${token}`
  return new Request('http://localhost/api/pedidos/ped_1/saldo', { headers })
}

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) }
}

describe('GET /api/pedidos/[orderId]/saldo', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    reset()
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 200 com os cinco valores por item (EXP-10)', async () => {
    pedidos.ped_1 = [
      item({
        id: 'item_1',
        solicitado: new Prisma.Decimal(10),
        executado: new Prisma.Decimal(8),
        entregue: new Prisma.Decimal(3),
      }),
    ]

    const response = await GET(request(), context('ped_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.itens).toHaveLength(1)
    expect(body.itens[0].itemId).toBe('item_1')
    expect(body.itens[0].solicitado).toBe('10')
    expect(body.itens[0].executado).toBe('8')
    expect(body.itens[0].disponivel).toBe('5')
    expect(body.itens[0].entregue).toBe('3')
    expect(body.itens[0].pendente).toBe('2')
  })

  it('responde 200 com os cinco valores de cada item (EXP-10)', async () => {
    pedidos.ped_1 = [
      item({
        id: 'item_1',
        solicitado: new Prisma.Decimal(10),
        executado: new Prisma.Decimal(8),
        entregue: new Prisma.Decimal(3),
      }),
      item({
        id: 'item_2',
        solicitado: new Prisma.Decimal(4),
        executado: new Prisma.Decimal(4),
        entregue: new Prisma.Decimal(4),
      }),
    ]

    const response = await GET(request(), context('ped_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.itens.map((linha: { itemId: string }) => linha.itemId)).toEqual([
      'item_1',
      'item_2',
    ])
    expect(body.itens[1].disponivel).toBe('0')
    expect(body.itens[1].pendente).toBe('0')
  })

  it('responde 200 com lista vazia quando o pedido não tem itens (EXP-10)', async () => {
    pedidos.ped_1 = []

    const response = await GET(request(), context('ped_1'))

    expect(response.status).toBe(200)
    expect((await response.json()).itens).toEqual([])
  })

  it('responde 404 quando o pedido não existe (EXP-12)', async () => {
    const response = await GET(request(), context('ped_x'))

    expect(response.status).toBe(404)
    expect((await response.json()).error).toBe('order_not_found')
  })

  it('responde 401 quando o token está ausente', async () => {
    const response = await GET(request({ token: null }), context('ped_1'))

    expect(response.status).toBe(401)
  })
})
