import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const prisma = {
    orderItem: {
      updateMany: vi.fn(),
      findUnique: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
      create: vi.fn(),
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

function erroP2002(target: string[]): unknown {
  return { code: 'P2002', meta: { target } }
}

describe('prismaClassificacaoRepository.markClassified', () => {
  beforeEach(() => {
    state.prisma.orderItem.updateMany.mockReset()
    state.prisma.orderItem.findUnique.mockReset()
    state.prisma.activity.findFirst.mockReset()
    state.prisma.activity.create.mockReset()
    state.prisma.$transaction.mockClear()
    state.prisma.$transaction.mockImplementation(
      async (fn: (tx: typeof state.prisma) => unknown) => fn(state.prisma),
    )
  })

  it('vence a transição condicional e cria a atividade na mesma transação', async () => {
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 1 })
    state.prisma.activity.findFirst.mockResolvedValue(null)
    state.prisma.activity.create.mockResolvedValue({
      id: 'act_1',
      orderItemId: 'item_1',
      sectorId: 'setor_telhas',
    })

    const activity = await prismaClassificacaoRepository.markClassified({
      itemId: 'item_1',
      sectorId: 'setor_telhas',
    })

    expect(activity).toEqual({
      id: 'act_1',
      orderItemId: 'item_1',
      sectorId: 'setor_telhas',
    })
    expect(state.prisma.orderItem.updateMany).toHaveBeenCalledWith({
      where: { id: 'item_1', classificationStatus: 'PENDING_CLASSIFICATION' },
      data: { classificationStatus: 'CLASSIFIED' },
    })
    expect(state.prisma.activity.create).toHaveBeenCalledWith({
      data: { orderItemId: 'item_1', sectorId: 'setor_telhas' },
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
    expect(state.prisma.activity.create).not.toHaveBeenCalled()
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
    expect(state.prisma.activity.create).not.toHaveBeenCalled()
  })

  it('não cria segunda atividade para item pendente que já tem atividade', async () => {
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 1 })
    state.prisma.activity.findFirst.mockResolvedValue({ id: 'act_existente' })

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)
    expect(state.prisma.activity.create).not.toHaveBeenCalled()
  })

  it('traduz apenas a violação conhecida de atividade única em conflito', async () => {
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 1 })
    state.prisma.activity.findFirst.mockResolvedValue(null)
    state.prisma.activity.create.mockRejectedValue(erroP2002(['orderItemId', 'sectorId']))

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)
  })

  it('não traduz P2002 de outra constraint em conflito de classificação', async () => {
    const erro = erroP2002(['outraColuna'])
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 1 })
    state.prisma.activity.findFirst.mockResolvedValue(null)
    state.prisma.activity.create.mockRejectedValue(erro)

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBe(erro)
  })

  it('propaga falha genérica na criação da atividade', async () => {
    const erro = new Error('falha ao criar atividade')
    state.prisma.orderItem.updateMany.mockResolvedValue({ count: 1 })
    state.prisma.activity.findFirst.mockResolvedValue(null)
    state.prisma.activity.create.mockRejectedValue(erro)

    await expect(
      prismaClassificacaoRepository.markClassified({
        itemId: 'item_1',
        sectorId: 'setor_telhas',
      }),
    ).rejects.toBe(erro)
  })
})
