import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import {
  PedidoNaoEncontradoError,
  saldoPedido,
  type ItemDoPedido,
  type SaldoPedidoRepository,
} from './saldo-pedido'

function createDeps(seed: { pedidos?: Record<string, ItemDoPedido[]> } = {}) {
  const pedidos = seed.pedidos ?? {}
  const repo: SaldoPedidoRepository = {
    async buscarItensDoPedido(orderId) {
      const found = pedidos[orderId]
      return found ? found.map((item) => ({ ...item })) : null
    },
  }
  return { repo, pedidos }
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

describe('saldoPedido', () => {
  it('retorna os cinco valores por item (EXP-10)', async () => {
    const { repo } = createDeps({
      pedidos: {
        ped_1: [
          item({
            id: 'item_1',
            solicitado: new Prisma.Decimal(10),
            executado: new Prisma.Decimal(8),
            entregue: new Prisma.Decimal(3),
          }),
        ],
      },
    })

    const saldo = await saldoPedido('ped_1', repo)

    expect(saldo).toHaveLength(1)
    expect(saldo[0].itemId).toBe('item_1')
    expect(saldo[0].solicitado.toString()).toBe('10')
    expect(saldo[0].executado.toString()).toBe('8')
    expect(saldo[0].disponivel.toString()).toBe('5')
    expect(saldo[0].entregue.toString()).toBe('3')
    expect(saldo[0].pendente.toString()).toBe('2')
  })

  it('calcula o pendente como solicitado menos executado (EXP-10)', async () => {
    const { repo } = createDeps({
      pedidos: {
        ped_1: [
          item({
            id: 'item_1',
            solicitado: new Prisma.Decimal(10),
            executado: new Prisma.Decimal(12),
          }),
        ],
      },
    })

    const saldo = await saldoPedido('ped_1', repo)

    expect(saldo[0].pendente.toString()).toBe('0')
  })

  it('retorna disponível zero quando o item não tem produção (EXP-14)', async () => {
    const { repo } = createDeps({
      pedidos: {
        ped_1: [
          item({
            id: 'item_1',
            solicitado: new Prisma.Decimal(10),
            executado: new Prisma.Decimal(0),
          }),
        ],
      },
    })

    const saldo = await saldoPedido('ped_1', repo)

    expect(saldo[0].disponivel.toString()).toBe('0')
  })

  it('retorna os cinco valores de cada item do pedido (EXP-10)', async () => {
    const { repo } = createDeps({
      pedidos: {
        ped_1: [
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
        ],
      },
    })

    const saldo = await saldoPedido('ped_1', repo)

    expect(saldo.map((linha) => linha.itemId)).toEqual(['item_1', 'item_2'])
    expect(saldo[1].disponivel.toString()).toBe('0')
    expect(saldo[1].pendente.toString()).toBe('0')
  })

  it('rejeita pedido inexistente', async () => {
    const { repo } = createDeps()

    await expect(saldoPedido('ped_x', repo)).rejects.toBeInstanceOf(PedidoNaoEncontradoError)
  })
})
