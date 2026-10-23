import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
}))

vi.mock('@/shared/db/prisma', () => ({
  prisma: {
    integrationJob: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}))

import { prismaIntegracaoRepository } from './prisma-integracao-repository'

const NOW = new Date('2026-10-23T12:00:00.000Z')

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job_1',
    orderId: 'order_1',
    legacyOrderNumber: '70435',
    idempotencyKey: 'pedido:70435',
    status: 'SUCCEEDED',
    attemptCount: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: NOW,
    ...overrides,
  }
}

beforeEach(() => {
  mocks.findUnique.mockReset()
  mocks.update.mockReset()
})

describe('prismaIntegracaoRepository — vínculo com o pedido', () => {
  it('devolve o orderId ao consultar o job', async () => {
    mocks.findUnique.mockResolvedValue(row())

    const job = await prismaIntegracaoRepository.findById('job_1')

    expect(job?.orderId).toBe('order_1')
  })

  it('grava o orderId ao concluir o job', async () => {
    mocks.update.mockResolvedValue(row({ status: 'SUCCEEDED' }))

    await prismaIntegracaoRepository.updateStatus({
      jobId: 'job_1',
      status: 'SUCCEEDED',
      now: NOW,
      orderId: 'order_1',
      completedAt: NOW,
    })

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: expect.objectContaining({ orderId: 'order_1', status: 'SUCCEEDED' }),
    })
  })
})
