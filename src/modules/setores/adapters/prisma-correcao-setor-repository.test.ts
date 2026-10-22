import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const prisma = {
    activity: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  }
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma))
  return { prisma }
})

vi.mock('@/shared/db/prisma', () => ({ prisma: state.prisma }))

import { prismaCorrecaoSetorRepository } from './prisma-correcao-setor-repository'

const setorAnterior = { id: 'setor_corte', code: 'CORTE', name: 'Corte e Dobra' }
const setorNovo = { id: 'setor_telhas', code: 'TELHAS', name: 'Telhas' }

describe('prismaCorrecaoSetorRepository', () => {
  beforeEach(() => {
    state.prisma.activity.findFirst.mockReset()
    state.prisma.activity.updateMany.mockReset()
    state.prisma.auditLog.create.mockReset()
  })

  it('lê a atividade com setor e contagem dos registros que travam a correção', async () => {
    state.prisma.activity.findFirst.mockResolvedValue({
      id: 'act_1',
      orderItemId: 'item_1',
      sectorId: 'setor_corte',
      status: 'PENDING',
      sector: { code: 'CORTE', name: 'Corte e Dobra' },
      _count: { executions: 2, occurrences: 1 },
      orderItem: { _count: { deliveries: 3 } },
    })

    const atividade = await prismaCorrecaoSetorRepository.findActivityByItemId('item_1')

    expect(atividade).toEqual({
      id: 'act_1',
      itemId: 'item_1',
      sectorId: 'setor_corte',
      sectorCode: 'CORTE',
      sectorName: 'Corte e Dobra',
      status: 'PENDING',
      execucoes: 2,
      ocorrencias: 1,
      entregas: 3,
    })
  })

  it('troca o setor só se a atividade continuar sem registros e grava a auditoria completa', async () => {
    state.prisma.activity.updateMany.mockResolvedValue({ count: 1 })
    state.prisma.auditLog.create.mockResolvedValue({})

    const trocado = await prismaCorrecaoSetorRepository.trocarSetorDaAtividade({
      atividadeId: 'act_1',
      itemId: 'item_1',
      setorAnterior,
      setorNovo,
      userId: 'user_gerente',
      motivo: 'Cadastro errado',
    })

    expect(trocado).toBe(true)
    expect(state.prisma.activity.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'act_1',
        orderItemId: 'item_1',
        sectorId: 'setor_corte',
        status: 'PENDING',
        executions: { none: {} },
        occurrences: { none: {} },
        orderItem: { deliveries: { none: {} } },
      },
      data: { sectorId: 'setor_telhas' },
    })
    expect(state.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_gerente',
        action: 'SECTOR_CORRECTION',
        entityType: 'OrderItem',
        entityId: 'item_1',
        beforeJson: {
          activityId: 'act_1',
          sectorId: 'setor_corte',
          sectorCode: 'CORTE',
          sectorName: 'Corte e Dobra',
        },
        afterJson: {
          activityId: 'act_1',
          sectorId: 'setor_telhas',
          sectorCode: 'TELHAS',
          sectorName: 'Telhas',
        },
        reason: 'Cadastro errado',
      },
    })
  })

  it('não grava auditoria quando a condição não se mantém na gravação', async () => {
    state.prisma.activity.updateMany.mockResolvedValue({ count: 0 })

    const trocado = await prismaCorrecaoSetorRepository.trocarSetorDaAtividade({
      atividadeId: 'act_1',
      itemId: 'item_1',
      setorAnterior,
      setorNovo,
      userId: 'user_vendedor',
      motivo: null,
    })

    expect(trocado).toBe(false)
    expect(state.prisma.auditLog.create).not.toHaveBeenCalled()
  })
})
