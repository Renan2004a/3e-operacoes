import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const prisma = {
    orderItem: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma))
  return { prisma }
})

vi.mock('@/shared/db/prisma', () => ({ prisma: state.prisma }))

import {
  ItemJaClassificadoError,
  ItemNaoEncontradoError,
} from '../classificar-item'
import { prismaClassificacaoRepository } from './prisma-classificacao-repository'

describe('prismaClassificacaoRepository.markClassified', () => {
  beforeEach(() => {
    state.prisma.orderItem.updateMany.mockReset()
    state.prisma.orderItem.findUnique.mockReset()
    state.prisma.$transaction.mockClear()
    state.prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof state.prisma) => unknown) => fn(state.prisma),
    )
  })

  it('vence a transição condicional e define o setor do item', async () => {
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 1 })

    const activity = await prismaClassificacaoRepository.markClassified({
      itemId: 'item_1',
      sectorId: 'setor_telhas',
    })

    expect(activity).toEqual({
      id: 'item_1',
      orderItemId: 'item_1',
      sectorId: 'setor_telhas',
    })
    expect(state.prisma.orderItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'item_1', sectorId: null },
      data: {
        sectorId: 'setor_telhas',
        classifiedAt: expect.any(Date),
        classifiedByUserId: null,
      },
    })
  })

  it('rejeita com conflito quando a atualização condicional não vence', async () => {
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 0 })
    state.prisma.orderItem.findUnique.mockResolvedValue({ id: 'item_1' })

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)
  })

  it('rejeita com item não encontrado quando ele deixou de existir', async () => {
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 0 })
    state.prisma.orderItem.findUnique.mockResolvedValue(null)

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBeInstanceOf(ItemNaoEncontradoError)
  })

  it('propaga falha genérica na gravação do setor', async () => {
    const erro = new Error('falha ao gravar setor')
    state.prisma.orderItem.updateMany.mockRejectedValue(erro)

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBe(erro)
  })
})
