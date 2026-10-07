import { Prisma } from '@/generated/prisma/client'
import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../../shared/http/auth-context'
import type {
  ItemDoPedido,
  SaldoPedidoRepository,
} from '../../../../../modules/expedicao/saldo-pedido'

const holder = vi.hoisted(() => ({
  repo: null as unknown as SaldoPedidoRepository,
  perfis: {} as Record<string, RoleCode[]>,
}))

vi.mock('../../../../../modules/expedicao/adapters/prisma-expedicao-repository', () => ({
  prismaExpedicaoRepository: {
    buscarItensDoPedido: (orderId: string) => holder.repo.buscarItensDoPedido(orderId),
  },
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: {
    findById: async (id: string) => ({ id, roles: [...(holder.perfis[id] ?? [])] }),
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

function request(opts: { usuarioId?: string | null; xUserId?: string | null } = {}): Request {
  const { usuarioId = 'user_1', xUserId = null } = opts
  const headers: Record<string, string> = {}
  if (usuarioId) {
    const token = assinarSessao({ userId: usuarioId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request('http://localhost/api/pedidos/ped_1/saldo', { headers })
}

function context(orderId: string) {
  return { params: Promise.resolve({ orderId }) }
}

describe('GET /api/pedidos/[orderId]/saldo', () => {
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

  it('responde 401 sem sessão (AUTH-14)', async () => {
    const response = await GET(request({ usuarioId: null }), context('ped_1'))

    expect(response.status).toBe(401)
  })

  it('ignora o cabeçalho x-user-id quando não há sessão (AUTH-14)', async () => {
    const response = await GET(
      request({ usuarioId: null, xUserId: 'user_1' }),
      context('ped_1'),
    )

    expect(response.status).toBe(401)
  })

  it('responde 403 quando o perfil não pode consultar (AUTH-14)', async () => {
    const response = await GET(request({ usuarioId: 'user_sem_perfil' }), context('ped_1'))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })
})
