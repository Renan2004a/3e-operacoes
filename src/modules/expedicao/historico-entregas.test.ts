import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import {
  listarEntregas,
  type EntregaHistorico,
  type HistoricoEntregasRepository,
} from './historico-entregas'
import { ItemNaoEncontradoError } from './registrar-entrega'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function createDeps(
  seed: {
    itens?: string[]
    entregas?: EntregaHistorico[]
  } = {},
) {
  const itens = new Set(seed.itens ?? ['item_1'])
  const entregas = [...(seed.entregas ?? [])]
  const repo: HistoricoEntregasRepository = {
    async buscarItemParaHistorico(itemId) {
      return itens.has(itemId) ? { id: itemId } : null
    },
    async listarEntregas(itemId) {
      return entregas.filter((entrega) => entrega.id.startsWith(itemId))
    },
  }
  return { repo, itens, entregas }
}

function entrega(
  overrides: Partial<EntregaHistorico> & Pick<EntregaHistorico, 'id'>,
): EntregaHistorico {
  return {
    id: overrides.id,
    quantidade: overrides.quantidade ?? new Prisma.Decimal(3),
    usuarioId: overrides.usuarioId ?? 'user_exp',
    usuarioNome: overrides.usuarioNome ?? 'Expedição',
    occurredAt: overrides.occurredAt ?? NOW,
    excecao: overrides.excecao ?? false,
  }
}

describe('listarEntregas', () => {
  it('retorna quantidade, autor e data/hora da entrega (EXP-11)', async () => {
    const { repo } = createDeps({
      entregas: [
        entrega({
          id: 'item_1_entrega_1',
          quantidade: new Prisma.Decimal(3),
          usuarioId: 'user_exp',
          usuarioNome: 'Ana Expedição',
          occurredAt: NOW,
        }),
      ],
    })

    const historico = await listarEntregas('item_1', repo)

    expect(historico).toHaveLength(1)
    expect(historico[0].quantidade.toString()).toBe('3')
    expect(historico[0].usuarioId).toBe('user_exp')
    expect(historico[0].usuarioNome).toBe('Ana Expedição')
    expect(historico[0].occurredAt).toBe(NOW)
  })

  it('marca a entrega com exceção quando houve override (EXP-11)', async () => {
    const { repo } = createDeps({
      entregas: [
        entrega({ id: 'item_1_entrega_1', excecao: false }),
        entrega({ id: 'item_1_entrega_2', excecao: true }),
      ],
    })

    const historico = await listarEntregas('item_1', repo)

    expect(historico.map((registro) => registro.excecao)).toEqual([false, true])
  })

  it('retorna lista vazia quando o item não tem entregas (EXP-11)', async () => {
    const { repo } = createDeps({ entregas: [] })

    const historico = await listarEntregas('item_1', repo)

    expect(historico).toEqual([])
  })

  it('retorna todas as entregas do item (EXP-11)', async () => {
    const { repo } = createDeps({
      entregas: [
        entrega({ id: 'item_1_entrega_1' }),
        entrega({ id: 'item_1_entrega_2' }),
        entrega({ id: 'item_2_entrega_1' }),
      ],
    })

    const historico = await listarEntregas('item_1', repo)

    expect(historico.map((registro) => registro.id)).toEqual([
      'item_1_entrega_1',
      'item_1_entrega_2',
    ])
  })

  it('rejeita histórico de item inexistente (EXP-12)', async () => {
    const { repo } = createDeps({ itens: ['item_1'] })

    await expect(listarEntregas('item_x', repo)).rejects.toBeInstanceOf(ItemNaoEncontradoError)
  })
})
