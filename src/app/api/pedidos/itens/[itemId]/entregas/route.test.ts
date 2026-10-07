import { Prisma } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExpedicaoRepository } from '../../../../../../modules/expedicao/adapters/prisma-expedicao-repository'
import type { EntregaHistorico } from '../../../../../../modules/expedicao/historico-entregas'
import type {
  Entrega,
  PapelUsuario,
} from '../../../../../../modules/expedicao/registrar-entrega'

const holder = vi.hoisted(() => ({
  repo: null as unknown as ExpedicaoRepository,
}))

vi.mock('../../../../../../modules/expedicao/adapters/prisma-expedicao-repository', () => ({
  prismaExpedicaoRepository: {
    buscarItemParaEntrega: (itemId: string) => holder.repo.buscarItemParaEntrega(itemId),
    papeisDoUsuario: (usuarioId: string) => holder.repo.papeisDoUsuario(usuarioId),
    registrarEntrega: (input: Parameters<ExpedicaoRepository['registrarEntrega']>[0]) =>
      holder.repo.registrarEntrega(input),
    buscarItensDoPedido: (orderId: string) => holder.repo.buscarItensDoPedido(orderId),
    buscarItemParaHistorico: (itemId: string) => holder.repo.buscarItemParaHistorico(itemId),
    listarEntregas: (itemId: string) => holder.repo.listarEntregas(itemId),
  },
}))

import { GET, POST } from './route'

const NOW = new Date('2026-10-07T12:00:00.000Z')

interface ItemRow {
  id: string
  unidade: string
  executado: Prisma.Decimal
}

const state = {
  itens: [] as ItemRow[],
  papeis: {} as Record<string, PapelUsuario[]>,
  entregas: [] as Entrega[],
  seq: 0,
}

function somaEntregue(itemId: string): Prisma.Decimal {
  return state.entregas
    .filter((entrega) => entrega.orderItemId === itemId)
    .reduce((total, entrega) => total.plus(entrega.quantidade), new Prisma.Decimal(0))
}

holder.repo = {
  async buscarItemParaEntrega(itemId) {
    const found = state.itens.find((candidate) => candidate.id === itemId)
    if (!found) return null
    return {
      id: found.id,
      unidade: found.unidade,
      executado: found.executado,
      entregue: somaEntregue(itemId),
    }
  },
  async papeisDoUsuario(usuarioId) {
    return state.papeis[usuarioId] ?? []
  },
  async registrarEntrega(input) {
    const entregueTotal = somaEntregue(input.itemId).plus(input.quantidade)
    const status = input.resolverStatus(entregueTotal)
    state.seq += 1
    const entrega: Entrega = {
      id: `entrega_${state.seq}`,
      orderItemId: input.itemId,
      userId: input.usuarioId,
      quantidade: input.quantidade,
      managerOverride: input.managerOverride,
      overrideReason: input.overrideReason,
      authorizedByUserId: input.authorizedByUserId,
      availableBefore: input.availableBefore,
      occurredAt: input.occurredAt,
    }
    state.entregas.push(entrega)
    return { entrega, entregueTotal, status }
  },
  async buscarItensDoPedido() {
    return null
  },
  async buscarItemParaHistorico(itemId) {
    const found = state.itens.find((candidate) => candidate.id === itemId)
    return found ? { id: found.id } : null
  },
  async listarEntregas(itemId): Promise<EntregaHistorico[]> {
    return state.entregas
      .filter((entrega) => entrega.orderItemId === itemId)
      .map((entrega) => ({
        id: entrega.id,
        quantidade: entrega.quantidade,
        usuarioId: entrega.userId,
        usuarioNome: 'Autor',
        occurredAt: entrega.occurredAt,
        excecao: entrega.managerOverride,
      }))
  },
}

function reset() {
  state.itens.length = 0
  state.entregas.length = 0
  for (const key of Object.keys(state.papeis)) delete state.papeis[key]
  state.seq = 0
}

function seedItem(id: string, executado: number | string = 8) {
  state.itens.push({ id, unidade: 'M', executado: new Prisma.Decimal(executado) })
}

function seedEntrega(itemId: string, quantidade: number | string, excecao = false) {
  state.seq += 1
  state.entregas.push({
    id: `seed_${state.seq}`,
    orderItemId: itemId,
    userId: 'user_prev',
    quantidade: new Prisma.Decimal(quantidade),
    managerOverride: excecao,
    overrideReason: excecao ? 'motivo anterior' : null,
    authorizedByUserId: excecao ? 'user_mgr' : null,
    availableBefore: null,
    occurredAt: NOW,
  })
}

function postRequest(
  body: unknown,
  opts: { usuarioId?: string | null; token?: string | null } = {},
): Request {
  const { usuarioId = 'user_exp', token = 'segredo-interno' } = opts
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token !== null) headers.authorization = `Bearer ${token}`
  if (usuarioId !== null) headers['x-user-id'] = usuarioId
  return new Request('http://localhost/api/pedidos/itens/item_1/entregas', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
}

function getRequest(opts: { token?: string | null } = {}): Request {
  const { token = 'segredo-interno' } = opts
  const headers: Record<string, string> = {}
  if (token !== null) headers.authorization = `Bearer ${token}`
  return new Request('http://localhost/api/pedidos/itens/item_1/entregas', { headers })
}

function context(itemId: string) {
  return { params: Promise.resolve({ itemId }) }
}

describe('/api/pedidos/itens/[itemId]/entregas', () => {
  const original = process.env.APP_INTERNAL_TOKEN

  beforeEach(() => {
    process.env.APP_INTERNAL_TOKEN = 'segredo-interno'
    reset()
    state.papeis.user_exp = ['SHIPPING']
    state.papeis.user_mgr = ['PRODUCTION_MANAGER']
    state.papeis.user_v = ['SELLER']
  })

  afterEach(() => {
    if (original === undefined) delete process.env.APP_INTERNAL_TOKEN
    else process.env.APP_INTERNAL_TOKEN = original
  })

  it('responde 201 e persiste a entrega válida (EXP-03)', async () => {
    seedItem('item_1', 8)

    const response = await POST(postRequest({ quantidade: '3' }), context('item_1'))

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.entrega.userId).toBe('user_exp')
    expect(body.entrega.quantidade).toBe('3')
    expect(body.status).toBe('PARCIAL')
    expect(state.entregas).toHaveLength(1)
  })

  it('responde 201 com exceção do gerente acima do disponível (EXP-06)', async () => {
    seedItem('item_1', 8)
    seedEntrega('item_1', 3)

    const response = await POST(
      postRequest(
        { quantidade: '6', excecao: true, motivoExcecao: 'cliente urgente' },
        { usuarioId: 'user_mgr' },
      ),
      context('item_1'),
    )

    expect(response.status).toBe(201)
    const body = await response.json()
    expect(body.entrega.managerOverride).toBe(true)
    expect(body.entrega.overrideReason).toBe('cliente urgente')
    expect(body.entrega.availableBefore).toBe('5')
    expect(state.entregas).toHaveLength(2)
  })

  it('responde 409 quando a entrega ultrapassa o disponível (EXP-05)', async () => {
    seedItem('item_1', 8)
    seedEntrega('item_1', 3)

    const response = await POST(postRequest({ quantidade: '6' }), context('item_1'))

    expect(response.status).toBe(409)
    expect((await response.json()).error).toBe('above_available')
    expect(state.entregas).toHaveLength(1)
  })

  it('responde 403 quando o papel não pode entregar (EXP-04)', async () => {
    seedItem('item_1', 8)

    const response = await POST(
      postRequest({ quantidade: '1' }, { usuarioId: 'user_v' }),
      context('item_1'),
    )

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
    expect(state.entregas).toHaveLength(0)
  })

  it('responde 400 para corpo ou quantidade inválidos (EXP-13)', async () => {
    seedItem('item_1', 8)

    const semQuantidade = await POST(postRequest({}), context('item_1'))
    expect(semQuantidade.status).toBe(400)

    const quantidadeZero = await POST(postRequest({ quantidade: '0' }), context('item_1'))
    expect(quantidadeZero.status).toBe(400)
    expect((await quantidadeZero.json()).error).toBe('invalid_quantity')
    expect(state.entregas).toHaveLength(0)
  })

  it('responde 200 com o histórico de entregas do item (EXP-11)', async () => {
    seedItem('item_1', 8)
    seedEntrega('item_1', 3)
    seedEntrega('item_1', 2, true)

    const response = await GET(getRequest(), context('item_1'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.entregas).toHaveLength(2)
    expect(body.entregas[0].quantidade).toBe('3')
    expect(body.entregas[0].usuarioId).toBe('user_prev')
    expect(body.entregas[1].excecao).toBe(true)
  })

  it('responde 404 quando o item não existe (EXP-12)', async () => {
    const post = await POST(postRequest({ quantidade: '1' }), context('item_x'))
    expect(post.status).toBe(404)
    expect((await post.json()).error).toBe('item_not_found')

    const get = await GET(getRequest(), context('item_x'))
    expect(get.status).toBe(404)
  })

  it('responde 401 sem token no POST e no GET', async () => {
    seedItem('item_1', 8)

    const post = await POST(postRequest({ quantidade: '1' }, { token: null }), context('item_1'))
    expect(post.status).toBe(401)

    const get = await GET(getRequest({ token: null }), context('item_1'))
    expect(get.status).toBe(401)
  })
})
