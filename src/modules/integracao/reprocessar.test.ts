import { describe, expect, it } from 'vitest'
import {
  JobNotFailedError,
  JobNotFoundError,
  type IntegracaoRepository,
  type IntegrationJob,
  type IntegrationJobEventRecord,
  type JobStatus,
} from './contratos'
import { reprocessar } from './reprocessar'

const NOW = new Date('2026-10-06T12:00:00.000Z')

function makeJob(id: string, status: JobStatus): IntegrationJob {
  return {
    id,
    legacyOrderNumber: '70435',
    idempotencyKey: 'pedido:70435',
    status,
    attemptCount: 1,
    errorCode: status === 'FAILED' ? 'CONNECTOR_TIMEOUT' : null,
    errorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  }
}

function createFakeRepo(seedJobs: IntegrationJob[] = [], seedEvents: IntegrationJobEventRecord[] = []) {
  const jobs = [...seedJobs]
  const events = [...seedEvents]
  let seq = seedJobs.length + seedEvents.length

  const repo: IntegracaoRepository = {
    async findRecentByIdempotencyKey() {
      return null
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
    async updateStatus() {
      throw new Error('não usado')
    },
    async appendEvent() {
      throw new Error('não usado')
    },
    async listEvents(jobId) {
      return events.filter((event) => event.jobId === jobId)
    },
  }

  return { repo, jobs, events }
}

describe('reprocessar', () => {
  it('lança JobNotFoundError quando o job não existe', async () => {
    const { repo } = createFakeRepo()

    await expect(reprocessar('job_x', repo, NOW)).rejects.toBeInstanceOf(JobNotFoundError)
  })

  it('rejeita com conflito quando o job não está FAILED', async () => {
    for (const status of ['PENDING', 'DISPATCHED', 'RUNNING', 'SUCCEEDED'] as const) {
      const { repo, jobs } = createFakeRepo([makeJob('job_1', status)])

      await expect(reprocessar('job_1', repo, NOW)).rejects.toBeInstanceOf(JobNotFailedError)
      expect(jobs).toHaveLength(1)
    }
  })

  it('cria um novo despacho para um job FAILED', async () => {
    const { repo, jobs } = createFakeRepo([makeJob('job_failed', 'FAILED')])

    const result = await reprocessar('job_failed', repo, NOW)

    expect(result.jobId).not.toBe('job_failed')
    expect(jobs).toHaveLength(2)
    const created = jobs.find((job) => job.id === result.jobId)
    expect(created?.status).toBe('PENDING')
    expect(created?.legacyOrderNumber).toBe('70435')
    expect(created?.idempotencyKey).toBe(`pedido:70435:retry:${NOW.getTime()}`)
    expect(jobs.find((job) => job.id === 'job_failed')?.status).toBe('FAILED')
  })

  it('preserva o histórico do job anterior', async () => {
    const oldEvents: IntegrationJobEventRecord[] = [
      { id: 'evt_1', jobId: 'job_failed', type: 'FAILED', detail: 'CONNECTOR_TIMEOUT', createdAt: NOW },
    ]
    const { repo, events } = createFakeRepo([makeJob('job_failed', 'FAILED')], oldEvents)

    const result = await reprocessar('job_failed', repo, NOW)

    expect(events).toEqual(oldEvents)
    expect(await repo.listEvents('job_failed')).toEqual(oldEvents)
    expect(await repo.listEvents(result.jobId)).toHaveLength(0)
  })
})
