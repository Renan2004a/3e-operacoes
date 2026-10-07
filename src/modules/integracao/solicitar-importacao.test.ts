import { describe, expect, it } from 'vitest'
import {
  IDEMPOTENCY_WINDOW_MS,
  InvalidOrderNumberError,
  type IntegrationJob,
  type IntegrationJobEventRecord,
  type IntegracaoRepository,
} from './contratos'
import { solicitarImportacao } from './solicitar-importacao'

function createFakeRepo(): IntegracaoRepository & { jobs: IntegrationJob[] } {
  const jobs: IntegrationJob[] = []
  const events: IntegrationJobEventRecord[] = []
  let seq = 0

  return {
    jobs,
    async findRecentByIdempotencyKey(idempotencyKey, since) {
      return (
        jobs.find(
          (job) => job.idempotencyKey === idempotencyKey && job.createdAt.getTime() >= since.getTime(),
        ) ?? null
      )
    },
    async findById(jobId) {
      return jobs.find((job) => job.id === jobId) ?? null
    },
    async create({ legacyOrderNumber, idempotencyKey, now }) {
      const existing = jobs.find((job) => job.idempotencyKey === idempotencyKey)
      if (existing) return existing
      seq += 1
      const job: IntegrationJob = {
        id: `job_${seq}`,
        legacyOrderNumber,
        idempotencyKey,
        status: 'PENDING',
        attemptCount: 0,
        errorCode: null,
        errorMessage: null,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
      }
      jobs.push(job)
      return job
    },
    async updateStatus({ jobId, status, now, errorCode, errorMessage, completedAt }) {
      const job = jobs.find((candidate) => candidate.id === jobId)
      if (!job) throw new Error('job não encontrado')
      job.status = status
      job.updatedAt = now
      if (errorCode !== undefined) job.errorCode = errorCode
      if (errorMessage !== undefined) job.errorMessage = errorMessage
      if (completedAt !== undefined) job.completedAt = completedAt
      return job
    },
    async appendEvent({ jobId, type, detail, now }) {
      seq += 1
      const event: IntegrationJobEventRecord = {
        id: `evt_${seq}`,
        jobId,
        type,
        detail: detail ?? null,
        createdAt: now,
      }
      events.push(event)
      return event
    },
    async listEvents(jobId) {
      return events.filter((event) => event.jobId === jobId)
    },
  }
}

const NOW = new Date('2026-10-06T12:00:00.000Z')

describe('solicitarImportacao', () => {
  it('cria job para número válido', async () => {
    const repo = createFakeRepo()

    const result = await solicitarImportacao({ orderNumber: '70435', now: NOW }, repo)

    expect(repo.jobs).toHaveLength(1)
    expect(repo.jobs[0].legacyOrderNumber).toBe('70435')
    expect(repo.jobs[0].idempotencyKey).toBe('pedido:70435')
    expect(repo.jobs[0].status).toBe('PENDING')
    expect(result).toEqual({ jobId: repo.jobs[0].id, reused: false })
  })

  it('rejeita número não inteiro sem criar job', async () => {
    const repo = createFakeRepo()

    await expect(solicitarImportacao({ orderNumber: '1.5', now: NOW }, repo)).rejects.toBeInstanceOf(
      InvalidOrderNumberError,
    )
    expect(repo.jobs).toHaveLength(0)
  })

  it('rejeita número zero sem criar job', async () => {
    const repo = createFakeRepo()

    await expect(solicitarImportacao({ orderNumber: '0', now: NOW }, repo)).rejects.toBeInstanceOf(
      InvalidOrderNumberError,
    )
    expect(repo.jobs).toHaveLength(0)
  })

  it('rejeita número negativo sem criar job', async () => {
    const repo = createFakeRepo()

    await expect(solicitarImportacao({ orderNumber: '-3', now: NOW }, repo)).rejects.toBeInstanceOf(
      InvalidOrderNumberError,
    )
    expect(repo.jobs).toHaveLength(0)
  })

  it('reutiliza o job existente dentro da janela de 60s', async () => {
    const repo = createFakeRepo()
    const first = await solicitarImportacao({ orderNumber: '70435', now: NOW }, repo)

    const later = new Date(NOW.getTime() + 30_000)
    const second = await solicitarImportacao({ orderNumber: '70435', now: later }, repo)

    expect(second).toEqual({ jobId: first.jobId, reused: true })
    expect(repo.jobs).toHaveLength(1)
  })

  it('após a janela, reaproveita o job mas sinaliza novo despacho', async () => {
    const repo = createFakeRepo()
    const first = await solicitarImportacao({ orderNumber: '70435', now: NOW }, repo)

    const after = new Date(NOW.getTime() + IDEMPOTENCY_WINDOW_MS + 1)
    const second = await solicitarImportacao({ orderNumber: '70435', now: after }, repo)

    expect(second).toEqual({ jobId: first.jobId, reused: false })
    expect(repo.jobs).toHaveLength(1)
  })

  it('duas solicitações concorrentes do mesmo número criam um único job', async () => {
    const repo = createFakeRepo()

    const [a, b] = await Promise.all([
      solicitarImportacao({ orderNumber: '70435', now: NOW }, repo),
      solicitarImportacao({ orderNumber: '70435', now: NOW }, repo),
    ])

    expect(repo.jobs).toHaveLength(1)
    expect(a.jobId).toBe(b.jobId)
  })
})
