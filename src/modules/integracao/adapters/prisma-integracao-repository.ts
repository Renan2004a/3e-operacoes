import { prisma } from '@/shared/db/prisma'
import type {
  IntegracaoRepository,
  IntegrationJob,
  IntegrationJobEventRecord,
  ListaJobsRepository,
} from '../contratos'

interface IntegrationJobRow {
  id: string
  legacyOrderNumber: string
  idempotencyKey: string
  status: IntegrationJob['status']
  attemptCount: number
  errorCode: string | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

interface IntegrationJobEventRow {
  id: string
  jobId: string
  type: string
  detail: string | null
  createdAt: Date
}

function toJob(row: IntegrationJobRow): IntegrationJob {
  return {
    id: row.id,
    legacyOrderNumber: row.legacyOrderNumber,
    idempotencyKey: row.idempotencyKey,
    status: row.status,
    attemptCount: row.attemptCount,
    errorCode: row.errorCode,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
  }
}

function toEvent(row: IntegrationJobEventRow): IntegrationJobEventRecord {
  return {
    id: row.id,
    jobId: row.jobId,
    type: row.type,
    detail: row.detail,
    createdAt: row.createdAt,
  }
}

/** Implementação Prisma da porta `IntegracaoRepository`. */
export const prismaIntegracaoRepository: IntegracaoRepository & ListaJobsRepository = {
  async findRecentByIdempotencyKey(idempotencyKey, since) {
    const row = await prisma.integrationJob.findFirst({
      where: { idempotencyKey, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    })
    return row ? toJob(row) : null
  },

  async findById(jobId) {
    const row = await prisma.integrationJob.findUnique({ where: { id: jobId } })
    return row ? toJob(row) : null
  },

  async create({ legacyOrderNumber, idempotencyKey, now }) {
    // O upsert por `idempotencyKey` garante um único job mesmo em chamadas concorrentes.
    const row = await prisma.integrationJob.upsert({
      where: { idempotencyKey },
      create: {
        legacyOrderNumber,
        idempotencyKey,
        status: 'PENDING',
        createdAt: now,
        updatedAt: now,
      },
      update: {},
    })
    return toJob(row)
  },

  async updateStatus({ jobId, status, now, errorCode, errorMessage, completedAt }) {
    const row = await prisma.integrationJob.update({
      where: { id: jobId },
      data: {
        status,
        updatedAt: now,
        ...(errorCode !== undefined ? { errorCode } : {}),
        ...(errorMessage !== undefined ? { errorMessage } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    })
    return toJob(row)
  },

  async appendEvent({ jobId, type, detail, now }) {
    const row = await prisma.integrationJobEvent.create({
      data: { jobId, type, detail: detail ?? null, createdAt: now },
    })
    return toEvent(row)
  },

  async listEvents(jobId) {
    const rows = await prisma.integrationJobEvent.findMany({
      where: { jobId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toEvent)
  },

  async listJobs() {
    const rows = await prisma.integrationJob.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(toJob)
  },
}
