import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const tx = {
    integrationJob: {
      upsert: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  }
  const prisma = {
    integrationJob: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    integrationJobEvent: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  }
  return { prisma, tx }
})

vi.mock('@/shared/db/prisma', () => ({ prisma: state.prisma }))

import { prismaIntegracaoRepository } from './prisma-integracao-repository'

const NOW = new Date('2026-10-06T12:00:00.000Z')
const JOB = {
  id: 'job_1',
  legacyOrderNumber: '70435',
  idempotencyKey: 'pedido:70435',
  status: 'PENDING' as const,
  attemptCount: 0,
  errorCode: null,
  errorMessage: null,
  createdAt: NOW,
  updatedAt: NOW,
  completedAt: null,
}

describe('prismaIntegracaoRepository — auditoria da solicitação', () => {
  beforeEach(() => {
    state.prisma.$transaction.mockClear()
    state.prisma.integrationJob.upsert.mockReset()
    state.prisma.auditLog.create.mockReset()
    state.tx.integrationJob.upsert.mockReset()
    state.tx.auditLog.create.mockReset()
    state.prisma.$transaction.mockImplementation(async (fn: (client: typeof state.tx) => unknown) =>
      fn(state.tx),
    )
  })

  it('cria o job e a auditoria na mesma transação', async () => {
    state.tx.integrationJob.upsert.mockResolvedValue(JOB)
    state.tx.auditLog.create.mockResolvedValue({})

    const job = await prismaIntegracaoRepository.criarComAuditoria({
      legacyOrderNumber: '70435',
      idempotencyKey: 'pedido:70435',
      now: NOW,
      requestedByUserId: 'user_vendedor',
    })

    expect(state.prisma.$transaction).toHaveBeenCalledTimes(1)
    expect(state.tx.integrationJob.upsert).toHaveBeenCalledWith({
      where: { idempotencyKey: 'pedido:70435' },
      create: {
        legacyOrderNumber: '70435',
        idempotencyKey: 'pedido:70435',
        status: 'PENDING',
        createdAt: NOW,
        updatedAt: NOW,
      },
      update: {},
    })
    expect(state.tx.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_vendedor',
        action: 'IMPORT_REQUESTED',
        entityType: 'IntegrationJob',
        entityId: 'job_1',
        correlationId: 'pedido:70435',
        createdAt: NOW,
        afterJson: {
          jobId: 'job_1',
          legacyOrderNumber: '70435',
          idempotencyKey: 'pedido:70435',
          requestKind: 'NEW_ATTEMPT',
          newDispatch: true,
        },
      },
    })
    expect(job).toEqual(JOB)
  })

  it('propaga a falha da auditoria sem engolir o erro', async () => {
    state.tx.integrationJob.upsert.mockResolvedValue(JOB)
    state.tx.auditLog.create.mockRejectedValue(new Error('falha de auditoria'))

    await expect(
      prismaIntegracaoRepository.criarComAuditoria({
        legacyOrderNumber: '70435',
        idempotencyKey: 'pedido:70435',
        now: NOW,
        requestedByUserId: 'user_vendedor',
      }),
    ).rejects.toThrow('falha de auditoria')

    expect(state.tx.integrationJob.upsert).toHaveBeenCalledTimes(1)
    expect(state.tx.auditLog.create).toHaveBeenCalledTimes(1)
  })

  it('não grava auditoria órfã quando a criação do job falha', async () => {
    state.tx.integrationJob.upsert.mockRejectedValue(new Error('falha no job'))

    await expect(
      prismaIntegracaoRepository.criarComAuditoria({
        legacyOrderNumber: '70435',
        idempotencyKey: 'pedido:70435',
        now: NOW,
        requestedByUserId: 'user_vendedor',
      }),
    ).rejects.toThrow('falha no job')

    expect(state.tx.auditLog.create).not.toHaveBeenCalled()
  })

  it('audita a reutilização do job sem alterar a autoria anterior', async () => {
    state.prisma.auditLog.create.mockResolvedValue({})

    await prismaIntegracaoRepository.registrarAuditoriaSolicitacao({
      jobId: 'job_1',
      legacyOrderNumber: '70435',
      idempotencyKey: 'pedido:70435',
      requestedByUserId: 'user_outro',
      now: NOW,
      requestKind: 'REUSED_JOB',
      newDispatch: false,
    })

    expect(state.prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_outro',
        action: 'IMPORT_REQUESTED',
        entityType: 'IntegrationJob',
        entityId: 'job_1',
        correlationId: 'pedido:70435',
        createdAt: NOW,
        afterJson: {
          jobId: 'job_1',
          legacyOrderNumber: '70435',
          idempotencyKey: 'pedido:70435',
          requestKind: 'REUSED_JOB',
          newDispatch: false,
        },
      },
    })
  })

  it('mantém a criação técnica sem auditoria fora do fluxo de solicitação', async () => {
    state.prisma.integrationJob.upsert.mockResolvedValue(JOB)

    await prismaIntegracaoRepository.create({
      legacyOrderNumber: '70435',
      idempotencyKey: 'pedido:70435:retry:1',
      now: NOW,
    })

    expect(state.prisma.integrationJob.upsert).toHaveBeenCalledTimes(1)
    expect(state.prisma.auditLog.create).not.toHaveBeenCalled()
    expect(state.prisma.$transaction).not.toHaveBeenCalled()
  })
})
