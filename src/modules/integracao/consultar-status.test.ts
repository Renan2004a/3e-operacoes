import { describe, expect, it } from 'vitest'
import {
  JobNotFoundError,
  type IntegracaoRepository,
  type IntegrationJob,
  type IntegrationJobEventRecord,
  type JobStatus,
} from './contratos'
import { consultarStatus } from './consultar-status'

const NOW = new Date('2026-10-06T12:00:00.000Z')

function makeJob(id: string, status: JobStatus): IntegrationJob {
  return {
    id,
    legacyOrderNumber: '70435',
    idempotencyKey: 'pedido:70435',
    status,
    attemptCount: 0,
    errorCode: null,
    errorMessage: null,
    createdAt: NOW,
    updatedAt: NOW,
    completedAt: null,
  }
}

function createFakeRepo(
  jobs: IntegrationJob[],
  events: IntegrationJobEventRecord[] = [],
): IntegracaoRepository {
  return {
    async findRecentByIdempotencyKey() {
      return null
    },
    async findById(jobId) {
      return jobs.find((job) => job.id === jobId) ?? null
    },
    async create() {
      throw new Error('não usado')
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
}

describe('consultarStatus', () => {
  it('lança JobNotFoundError quando o job não existe', async () => {
    const repo = createFakeRepo([])

    await expect(consultarStatus('job_x', repo)).rejects.toBeInstanceOf(JobNotFoundError)
  })

  it('marca estados não finais como final=false', async () => {
    const repo = createFakeRepo([
      makeJob('job_pending', 'PENDING'),
      makeJob('job_dispatched', 'DISPATCHED'),
      makeJob('job_running', 'RUNNING'),
    ])

    for (const status of ['PENDING', 'DISPATCHED', 'RUNNING'] as const) {
      const result = await consultarStatus(`job_${status.toLowerCase()}`, repo)
      expect(result.final).toBe(false)
      expect(result.status).toBe(status)
    }
  })

  it('marca estados finais como final=true', async () => {
    const repo = createFakeRepo([
      makeJob('job_succeeded', 'SUCCEEDED'),
      makeJob('job_failed', 'FAILED'),
    ])

    await expect(consultarStatus('job_succeeded', repo)).resolves.toMatchObject({
      status: 'SUCCEEDED',
      final: true,
    })
    await expect(consultarStatus('job_failed', repo)).resolves.toMatchObject({
      status: 'FAILED',
      final: true,
    })
  })

  it('devolve o status e a lista de eventos do job', async () => {
    const events: IntegrationJobEventRecord[] = [
      { id: 'evt_1', jobId: 'job_1', type: 'CREATED', detail: null, createdAt: NOW },
      { id: 'evt_2', jobId: 'job_1', type: 'DISPATCHED', detail: 'enviado', createdAt: NOW },
    ]
    const repo = createFakeRepo([makeJob('job_1', 'RUNNING')], events)

    const result = await consultarStatus('job_1', repo)

    expect(result.jobId).toBe('job_1')
    expect(result.status).toBe('RUNNING')
    expect(result.events.map((event) => event.type)).toEqual(['CREATED', 'DISPATCHED'])
  })
})
