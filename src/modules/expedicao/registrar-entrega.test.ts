import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { QuantidadeInvalidaError } from '../producao/unidades'
import {
  EntregaAcimaDoDisponivelError,
  ItemNaoEncontradoError,
  MotivoExcecaoObrigatorioError,
  PapelSemPermissaoError,
  registrarEntrega,
  type Entrega,
  type ExpedicaoRepository,
  type PapelUsuario,
  type RegistrarEntregaPortInput,
} from './registrar-entrega'

const NOW = new Date('2026-10-07T12:00:00.000Z')

interface ItemSeed {
  id: string
  unidade: string
  executado: Prisma.Decimal
}

function createDeps(
  seed: {
    itens?: ItemSeed[]
    papeis?: Record<string, PapelUsuario[]>
    entregas?: Entrega[]
  } = {},
) {
  const itens = [...(seed.itens ?? [])]
  const papeis = seed.papeis ?? {}
  const entregas = [...(seed.entregas ?? [])]
  const portInputs: RegistrarEntregaPortInput[] = []
  let seq = 0

  const somaEntregue = (itemId: string) =>
    entregas
      .filter((candidate) => candidate.orderItemId === itemId)
      .reduce((total, candidate) => total.plus(candidate.quantidade), new Prisma.Decimal(0))

  const repo: ExpedicaoRepository = {
    async buscarItemParaEntrega(itemId) {
      const found = itens.find((candidate) => candidate.id === itemId)
      if (!found) return null
      return {
        id: found.id,
        unidade: found.unidade,
        executado: found.executado,
        entregue: somaEntregue(itemId),
      }
    },
    async papeisDoUsuario(usuarioId) {
      return papeis[usuarioId] ?? []
    },
    async registrarEntrega(input) {
      portInputs.push(input)
      const entregueTotal = somaEntregue(input.itemId).plus(input.quantidade)
      const status = input.resolverStatus(entregueTotal)
      seq += 1
      const entrega: Entrega = {
        id: `entrega_${seq}`,
        orderItemId: input.itemId,
        userId: input.usuarioId,
        quantidade: input.quantidade,
        managerOverride: input.managerOverride,
        overrideReason: input.overrideReason,
        authorizedByUserId: input.authorizedByUserId,
        availableBefore: input.availableBefore,
        occurredAt: input.occurredAt,
      }
      entregas.push(entrega)
      return { entrega, entregueTotal, status }
    },
  }

  return { repo, itens, entregas, portInputs }
}

function item(id: string, executado: number | string = 8): ItemSeed {
  return { id, unidade: 'M', executado: new Prisma.Decimal(executado) }
}

function entregaExistente(itemId: string, quantidade: number | string): Entrega {
  return {
    id: `seed_${itemId}_${quantidade}`,
    orderItemId: itemId,
    userId: 'user_prev',
    quantidade: new Prisma.Decimal(quantidade),
    managerOverride: false,
    overrideReason: null,
    authorizedByUserId: null,
    availableBefore: null,
    occurredAt: NOW,
  }
}

describe('registrarEntrega', () => {
  it('registra a entrega da Expedição com usuário e data/hora (EXP-03)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_exp: ['SHIPPING'] },
    })

    const result = await registrarEntrega(
      { itemId: 'item_1', usuarioId: 'user_exp', quantidade: '3', occurredAt: NOW },
      repo,
    )

    expect(result.entrega.userId).toBe('user_exp')
    expect(result.entrega.occurredAt).toBe(NOW)
    expect(result.entrega.quantidade.toString()).toBe('3')
    expect(result.entrega.managerOverride).toBe(false)
    expect(entregas).toHaveLength(1)
  })

  it('registra a entrega do Gerente dentro do disponível (EXP-03)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_mgr: ['PRODUCTION_MANAGER'] },
    })

    const result = await registrarEntrega(
      { itemId: 'item_1', usuarioId: 'user_mgr', quantidade: '2', occurredAt: NOW },
      repo,
    )

    expect(result.entrega.userId).toBe('user_mgr')
    expect(entregas).toHaveLength(1)
  })

  it('rejeita papel sem permissão e não persiste (EXP-04)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_v: ['SELLER'] },
    })

    await expect(
      registrarEntrega({ itemId: 'item_1', usuarioId: 'user_v', quantidade: '1' }, repo),
    ).rejects.toBeInstanceOf(PapelSemPermissaoError)
    expect(entregas).toHaveLength(0)
  })

  it('bloqueia entrega acima do disponível sem exceção e não persiste (EXP-05)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_exp: ['SHIPPING'] },
      entregas: [entregaExistente('item_1', 3)],
    })

    await expect(
      registrarEntrega({ itemId: 'item_1', usuarioId: 'user_exp', quantidade: '6' }, repo),
    ).rejects.toBeInstanceOf(EntregaAcimaDoDisponivelError)
    expect(entregas).toHaveLength(1)
  })

  it('registra exceção do gerente acima do disponível com motivo e auditoria (EXP-06)', async () => {
    const { repo, entregas, portInputs } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_mgr: ['PRODUCTION_MANAGER'] },
      entregas: [entregaExistente('item_1', 3)],
    })

    const result = await registrarEntrega(
      {
        itemId: 'item_1',
        usuarioId: 'user_mgr',
        quantidade: '6',
        excecao: true,
        motivoExcecao: 'cliente urgente',
        occurredAt: NOW,
      },
      repo,
    )

    expect(result.entrega.managerOverride).toBe(true)
    expect(result.entrega.overrideReason).toBe('cliente urgente')
    expect(result.entrega.authorizedByUserId).toBe('user_mgr')
    expect(result.entrega.availableBefore?.toString()).toBe('5')
    expect(entregas).toHaveLength(2)

    const auditoria = portInputs[0].auditoria
    expect(auditoria?.disponivelAntes.toString()).toBe('5')
    expect(auditoria?.quantidade.toString()).toBe('6')
    expect(auditoria?.gerenteId).toBe('user_mgr')
    expect(auditoria?.occurredAt).toBe(NOW)
  })

  it('rejeita exceção do gerente sem motivo e não persiste (EXP-07)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_mgr: ['PRODUCTION_MANAGER'] },
    })

    await expect(
      registrarEntrega(
        { itemId: 'item_1', usuarioId: 'user_mgr', quantidade: '9', excecao: true },
        repo,
      ),
    ).rejects.toBeInstanceOf(MotivoExcecaoObrigatorioError)
    expect(entregas).toHaveLength(0)
  })

  it('rejeita exceção solicitada por quem não é gerente (EXP-07)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_exp: ['SHIPPING'] },
    })

    await expect(
      registrarEntrega(
        {
          itemId: 'item_1',
          usuarioId: 'user_exp',
          quantidade: '9',
          excecao: true,
          motivoExcecao: 'x',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(PapelSemPermissaoError)
    expect(entregas).toHaveLength(0)
  })

  it('mantém o item como parcial enquanto o entregue fica abaixo do executado (EXP-08)', async () => {
    const { repo } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_exp: ['SHIPPING'] },
      entregas: [entregaExistente('item_1', 3)],
    })

    const result = await registrarEntrega(
      { itemId: 'item_1', usuarioId: 'user_exp', quantidade: '2', occurredAt: NOW },
      repo,
    )

    expect(result.status).toBe('PARCIAL')
  })

  it('marca o item como concluído quando o entregue alcança o executado (EXP-09)', async () => {
    const { repo } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_exp: ['SHIPPING'] },
      entregas: [entregaExistente('item_1', 6)],
    })

    const result = await registrarEntrega(
      { itemId: 'item_1', usuarioId: 'user_exp', quantidade: '2', occurredAt: NOW },
      repo,
    )

    expect(result.status).toBe('CONCLUIDO')
  })

  it('rejeita quantidade zero ou negativa e não persiste (EXP-13)', async () => {
    const { repo, entregas } = createDeps({
      itens: [item('item_1', 8)],
      papeis: { user_exp: ['SHIPPING'] },
    })

    await expect(
      registrarEntrega({ itemId: 'item_1', usuarioId: 'user_exp', quantidade: '0' }, repo),
    ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    await expect(
      registrarEntrega({ itemId: 'item_1', usuarioId: 'user_exp', quantidade: '-2' }, repo),
    ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    expect(entregas).toHaveLength(0)
  })

  it('rejeita entrega de item inexistente (EXP-12)', async () => {
    const { repo, entregas } = createDeps({ papeis: { user_exp: ['SHIPPING'] } })

    await expect(
      registrarEntrega({ itemId: 'item_x', usuarioId: 'user_exp', quantidade: '1' }, repo),
    ).rejects.toBeInstanceOf(ItemNaoEncontradoError)
    expect(entregas).toHaveLength(0)
  })
})
