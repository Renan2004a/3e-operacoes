import { prisma } from '@/shared/db/prisma'
import type {
  IntegracaoRepository,
  IntegrationJob,
  IntegrationJobEventRecord,
  ListaJobsRepository,
} from '../contratos'
import type {
  AuditoriaSolicitacaoImportacao,
  SolicitacaoImportacaoRepository,
} from '../solicitar-importacao'

interface IntegrationJobRow {
  id: string
  orderId: string | null
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
    orderId: row.orderId,
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

function dadosDoJob(input: {
  legacyOrderNumber: string
  idempotencyKey: string
  now: Date
  requestedByUserId?: string | null
}) {
  return {
    where: { idempotencyKey: input.idempotencyKey },
    create: {
      legacyOrderNumber: input.legacyOrderNumber,
      idempotencyKey: input.idempotencyKey,
      status: 'PENDING' as const,
      requestedByUserId: input.requestedByUserId ?? null,
      createdAt: input.now,
      updatedAt: input.now,
    },
    update: {},
  }
}

function dadosDaAuditoria(input: AuditoriaSolicitacaoImportacao) {
  return {
    userId: input.requestedByUserId,
    action: 'IMPORT_REQUESTED',
    entityType: 'IntegrationJob',
    entityId: input.jobId,
    correlationId: input.idempotencyKey,
    createdAt: input.now,
    afterJson: {
      jobId: input.jobId,
      legacyOrderNumber: input.legacyOrderNumber,
      idempotencyKey: input.idempotencyKey,
      requestKind: input.requestKind,
      newDispatch: input.newDispatch,
    },
  }
}

/** Implementação Prisma da porta `IntegracaoRepository`. */
export const prismaIntegracaoRepository: IntegracaoRepository &
  ListaJobsRepository &
  SolicitacaoImportacaoRepository = {
  async findRecentByIdempotencyKey(idempotencyKey, since) {
    const row = await prisma.integrationJob.findFirst({
      where: { idempotencyKey, createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    })
    return row ? toJob(row) : null
  },

  async findLatestByOrderNumberSince(legacyOrderNumber, since) {
    const row = await prisma.integrationJob.findFirst({
      where: { legacyOrderNumber, createdAt: { gte: since } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
    return row ? toJob(row) : null
  },

  async findById(jobId) {
    const row = await prisma.integrationJob.findUnique({ where: { id: jobId } })
    return row ? toJob(row) : null
  },

  async iniciarDespacho(jobId, now, atualizadoEmEsperado) {
    const resultado = await prisma.integrationJob.updateMany({
      where: {
        id: jobId,
        // Sem carimbo de tentativa, só um job novo (PENDING) pode ser
        // despachado. Com o carimbo, a solicitação explícita pode reiniciar o
        // job no estado capturado — inclusive um final ou um RUNNING antigo —
        // desde que ninguém o tenha alterado desde a leitura.
        ...(atualizadoEmEsperado
          ? { updatedAt: atualizadoEmEsperado }
          : { status: 'PENDING' as const }),
      },
      data: {
        status: 'DISPATCHED',
        updatedAt: now,
        errorCode: null,
        errorMessage: null,
        completedAt: null,
      },
    })
    return resultado.count === 1
  },

  async create({ legacyOrderNumber, idempotencyKey, now }) {
    // O upsert por `idempotencyKey` garante um único job mesmo em chamadas concorrentes.
    const row = await prisma.integrationJob.upsert(
      dadosDoJob({ legacyOrderNumber, idempotencyKey, now }),
    )
    return toJob(row)
  },

  async criarComAuditoria({ legacyOrderNumber, idempotencyKey, now, requestedByUserId }) {
    return prisma.$transaction(async (tx) => {
      // Se a auditoria falhar, o upsert do job é desfeito pelo rollback.
      const row = await tx.integrationJob.upsert(
        dadosDoJob({ legacyOrderNumber, idempotencyKey, now, requestedByUserId }),
      )
      await tx.auditLog.create({
        data: dadosDaAuditoria({
          jobId: row.id,
          legacyOrderNumber,
          idempotencyKey,
          requestedByUserId,
          now,
          requestKind: 'NEW_ATTEMPT',
          newDispatch: true,
        }),
      })
      return toJob(row)
    })
  },

  async registrarAuditoriaSolicitacao(input) {
    await prisma.auditLog.create({ data: dadosDaAuditoria(input) })
  },

  async registrarJobObsoleto({ jobId, now }) {
    // Não altera o status: o novo despacho reutiliza a mesma linha e a move
    // para DISPATCHED/RUNNING. O evento explica por que houve nova tentativa.
    await prisma.auditLog.create({
      data: {
        action: 'STALE_TIMEOUT',
        entityType: 'JobIntegracao',
        entityId: jobId,
        afterJson: {
          detalhe: 'Tentativa anterior sem resposta do conector; nova consulta iniciada.',
        },
        createdAt: now,
      },
    })
  },

  async updateStatus({ jobId, status, now, orderId, errorCode, errorMessage, completedAt }) {
    const row = await prisma.integrationJob.update({
      where: { id: jobId },
      data: {
        status,
        updatedAt: now,
        ...(orderId !== undefined ? { orderId } : {}),
        ...(errorCode !== undefined ? { errorCode } : {}),
        ...(errorMessage !== undefined ? { errorMessage } : {}),
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
    })
    return toJob(row)
  },

  async appendEvent({ jobId, type, detail, now }) {
    const row = await prisma.auditLog.create({
      data: {
        action: type,
        entityType: 'JobIntegracao',
        entityId: jobId,
        afterJson: { detalhe: detail ?? null },
        createdAt: now,
      },
    })
    return toEvent({
      id: row.id,
      jobId,
      type,
      detail: detail ?? null,
      createdAt: row.createdAt,
    })
  },

  async listEvents(jobId) {
    const rows = await prisma.auditLog.findMany({
      where: { entityType: 'JobIntegracao', entityId: jobId },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => {
      const depois = row.afterJson as { detalhe?: string | null } | null
      return toEvent({
        id: row.id,
        jobId,
        type: row.action,
        detail: depois?.detalhe ?? null,
        createdAt: row.createdAt,
      })
    })
  },

  async listJobs() {
    const rows = await prisma.integrationJob.findMany({ orderBy: { createdAt: 'desc' } })
    return rows.map(toJob)
  },
}
