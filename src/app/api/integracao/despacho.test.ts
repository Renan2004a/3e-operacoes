import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/server', () => ({ after: vi.fn() }))

vi.mock('../../../modules/integracao/adapters/prisma-integracao-repository', () => ({
  prismaIntegracaoRepository: {},
}))

vi.mock('../../../modules/integracao/adapters/http-conector-legado', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('../../../modules/integracao/adapters/http-conector-legado')
    >()
  return { ...actual, createHttpConectorLegado: vi.fn() }
})

import { ConectorLegadoError } from '../../../modules/integracao/adapters/http-conector-legado'
import type {
  ConectorLegadoPort,
  IntegracaoRepository,
  IntegrationJob,
  IntegrationJobEventRecord,
  JobStatus,
} from '../../../modules/integracao/contratos'
import {
  DEFAULT_MAX_ATTEMPTS,
  DEFAULT_RETRY_BACKOFF_MS,
  despacharComRetry,
  erroTransitorio,
  resolverMaxAttempts,
  resolverRetryBackoffMs,
} from './despacho'

interface FakeRepo extends IntegracaoRepository {
  status: JobStatus | null
  errorCode: string | null
  events: IntegrationJobEventRecord[]
  statuses: JobStatus[]
}

function criarRepoFake(): FakeRepo {
  const events: IntegrationJobEventRecord[] = []
  let seq = 0
  const repo: FakeRepo = {
    status: null,
    errorCode: null,
    events,
    statuses: [],
    async findRecentByIdempotencyKey() {
      return null
    },
    async findById() {
      return null
    },
    async create() {
      throw new Error('não usado')
    },
    async updateStatus({ status, errorCode }) {
      repo.status = status
      repo.statuses.push(status)
      if (errorCode !== undefined) repo.errorCode = errorCode ?? null
      return {} as IntegrationJob
    },
    async appendEvent({ type, detail }) {
      seq += 1
      const event: IntegrationJobEventRecord = {
        id: `evt_${seq}`,
        jobId: 'job_1',
        type,
        detail: detail ?? null,
        createdAt: new Date(),
      }
      events.push(event)
      return event
    },
    async listEvents() {
      return events
    },
  }
  return repo
}

function conectorFake(comportamento: Array<() => Promise<void>>) {
  const chamadas: Array<{ jobId: string; orderNumber: string }> = []
  let indice = 0
  const conector: ConectorLegadoPort = {
    async despachar(input) {
      chamadas.push(input)
      const passo = comportamento[Math.min(indice, comportamento.length - 1)]
      indice += 1
      await passo()
    },
  }
  return { conector, chamadas }
}

function falha(code: string): () => Promise<void> {
  return async () => {
    throw new ConectorLegadoError(code, `falha ${code}`)
  }
}

function sucesso(): () => Promise<void> {
  return async () => {}
}

describe('despacho — classificação de erros', () => {
  it('considera transitórios apenas timeout, indisponibilidade e erro HTTP (LAC-11)', () => {
    expect(erroTransitorio('CONNECTOR_TIMEOUT')).toBe(true)
    expect(erroTransitorio('CONNECTOR_UNAVAILABLE')).toBe(true)
    expect(erroTransitorio('CONNECTOR_HTTP_ERROR')).toBe(true)
    expect(erroTransitorio('ORDER_NOT_FOUND')).toBe(false)
    expect(erroTransitorio('CONNECTOR_UNAUTHORIZED')).toBe(false)
    expect(erroTransitorio('CONNECTOR_INVALID_RESPONSE')).toBe(false)
  })

  it('resolve o máximo de tentativas da env CONNECTOR_MAX_ATTEMPTS com padrão 3 (LAC-11)', () => {
    expect(resolverMaxAttempts(undefined)).toBe(DEFAULT_MAX_ATTEMPTS)
    expect(DEFAULT_MAX_ATTEMPTS).toBe(3)
    expect(resolverMaxAttempts('5')).toBe(5)
    expect(resolverMaxAttempts('0')).toBe(DEFAULT_MAX_ATTEMPTS)
    expect(resolverMaxAttempts('abc')).toBe(DEFAULT_MAX_ATTEMPTS)
  })

  it('usa backoff padrão de 1s quando não configurado (LAC-11)', () => {
    expect(resolverRetryBackoffMs(undefined)).toBe(DEFAULT_RETRY_BACKOFF_MS)
    expect(DEFAULT_RETRY_BACKOFF_MS).toBe(1_000)
    expect(resolverRetryBackoffMs('0')).toBe(0)
  })
})

describe('despacharComRetry', () => {
  const originalMax = process.env.CONNECTOR_MAX_ATTEMPTS
  const originalBackoff = process.env.CONNECTOR_RETRY_BACKOFF_MS

  beforeEach(() => {
    delete process.env.CONNECTOR_MAX_ATTEMPTS
    delete process.env.CONNECTOR_RETRY_BACKOFF_MS
  })

  afterEach(() => {
    if (originalMax === undefined) delete process.env.CONNECTOR_MAX_ATTEMPTS
    else process.env.CONNECTOR_MAX_ATTEMPTS = originalMax
    if (originalBackoff === undefined) delete process.env.CONNECTOR_RETRY_BACKOFF_MS
    else process.env.CONNECTOR_RETRY_BACKOFF_MS = originalBackoff
  })

  it('sucede na primeira tentativa, marca RUNNING e registra DISPATCHED (LAC-11)', async () => {
    const repo = criarRepoFake()
    const { conector, chamadas } = conectorFake([sucesso()])

    await despacharComRetry({ jobId: 'job_1', orderNumber: '70435' }, { repo, conector })

    expect(chamadas).toHaveLength(1)
    expect(repo.status).toBe('RUNNING')
    expect(repo.events.map((event) => event.type)).toEqual(['DISPATCHED'])
  })

  it('repete a falha transitória e sucede na segunda tentativa (LAC-11)', async () => {
    const repo = criarRepoFake()
    const { conector, chamadas } = conectorFake([falha('CONNECTOR_TIMEOUT'), sucesso()])

    await despacharComRetry({ jobId: 'job_1', orderNumber: '70435' }, { repo, conector })

    expect(chamadas).toHaveLength(2)
    expect(repo.status).toBe('RUNNING')
    expect(repo.events.map((event) => event.type)).toEqual(['DISPATCHED', 'RETRY'])
  })

  it('esgota as tentativas transitórias antes de marcar FAILED (LAC-11)', async () => {
    const repo = criarRepoFake()
    const { conector, chamadas } = conectorFake([falha('CONNECTOR_UNAVAILABLE')])

    await despacharComRetry(
      { jobId: 'job_1', orderNumber: '70435' },
      { repo, conector, maxAttempts: 3 },
    )

    expect(chamadas).toHaveLength(3)
    expect(repo.status).toBe('FAILED')
    expect(repo.errorCode).toBe('CONNECTOR_UNAVAILABLE')
    expect(repo.events.map((event) => event.type)).toEqual(['DISPATCHED', 'RETRY', 'RETRY', 'FAILED'])
  })

  it('registra cada tentativa frustrada em evento RETRY com o número da tentativa (LAC-13)', async () => {
    const repo = criarRepoFake()
    const { conector } = conectorFake([falha('CONNECTOR_HTTP_ERROR')])

    await despacharComRetry(
      { jobId: 'job_1', orderNumber: '70435' },
      { repo, conector, maxAttempts: 3 },
    )

    const retries = repo.events.filter((event) => event.type === 'RETRY')
    expect(retries).toHaveLength(2)
    expect(retries[0].detail).toBe('CONNECTOR_HTTP_ERROR (tentativa 1/3)')
    expect(retries[1].detail).toBe('CONNECTOR_HTTP_ERROR (tentativa 2/3)')
  })

  it('não repete ORDER_NOT_FOUND e marca FAILED direto (LAC-12)', async () => {
    const repo = criarRepoFake()
    const { conector, chamadas } = conectorFake([falha('ORDER_NOT_FOUND')])

    await despacharComRetry({ jobId: 'job_1', orderNumber: '70435' }, { repo, conector })

    expect(chamadas).toHaveLength(1)
    expect(repo.status).toBe('FAILED')
    expect(repo.errorCode).toBe('ORDER_NOT_FOUND')
    expect(repo.events.map((event) => event.type)).toEqual(['DISPATCHED', 'FAILED'])
  })

  it('não repete CONNECTOR_UNAUTHORIZED e marca FAILED direto (LAC-12)', async () => {
    const repo = criarRepoFake()
    const { conector, chamadas } = conectorFake([falha('CONNECTOR_UNAUTHORIZED')])

    await despacharComRetry({ jobId: 'job_1', orderNumber: '70435' }, { repo, conector })

    expect(chamadas).toHaveLength(1)
    expect(repo.status).toBe('FAILED')
    expect(repo.errorCode).toBe('CONNECTOR_UNAUTHORIZED')
    expect(repo.events.map((event) => event.type)).toEqual(['DISPATCHED', 'FAILED'])
  })

  it('respeita o limite configurado em CONNECTOR_MAX_ATTEMPTS (LAC-11)', async () => {
    process.env.CONNECTOR_MAX_ATTEMPTS = '2'
    const repo = criarRepoFake()
    const { conector, chamadas } = conectorFake([falha('CONNECTOR_TIMEOUT')])

    await despacharComRetry({ jobId: 'job_1', orderNumber: '70435' }, { repo, conector })

    expect(chamadas).toHaveLength(2)
    expect(repo.status).toBe('FAILED')
  })

  it('aguarda o backoff configurado entre as tentativas (LAC-11)', async () => {
    const repo = criarRepoFake()
    const { conector } = conectorFake([falha('CONNECTOR_TIMEOUT')])
    const sleeps: number[] = []

    await despacharComRetry(
      { jobId: 'job_1', orderNumber: '70435' },
      { repo, conector, maxAttempts: 3, backoffMs: 1_000, sleep: async (ms) => void sleeps.push(ms) },
    )

    expect(sleeps).toEqual([1_000, 1_000])
  })
})
