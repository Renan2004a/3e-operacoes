import { describe, expect, it } from 'vitest'
import {
  IDEMPOTENCY_WINDOW_MS,
  STALE_ACTIVE_JOB_MS,
  InvalidOrderNumberError,
  type IntegrationJob,
} from './contratos'
import {
  SolicitanteObrigatorioError,
  solicitarImportacao,
  type AuditoriaSolicitacaoImportacao,
  type SolicitacaoImportacaoRepository,
} from './solicitar-importacao'

function createFakeRepo(): SolicitacaoImportacaoRepository & {
  jobs: IntegrationJob[]
  audits: AuditoriaSolicitacaoImportacao[]
  obsoletos: { jobId: string; now: Date }[]
} {
  const jobs: IntegrationJob[] = []
  const audits: AuditoriaSolicitacaoImportacao[] = []
  const obsoletos: { jobId: string; now: Date }[] = []
  let seq = 0

  return {
    jobs,
    audits,
    obsoletos,
    async findRecentByIdempotencyKey(idempotencyKey, since) {
      return (
        jobs.find(
          (job) =>
            job.idempotencyKey === idempotencyKey && job.createdAt.getTime() >= since.getTime(),
        ) ?? null
      )
    },
    async findLatestByOrderNumberSince(legacyOrderNumber, since) {
      return (
        jobs
          .filter(
            (job) =>
              job.legacyOrderNumber === legacyOrderNumber &&
              job.createdAt.getTime() >= since.getTime(),
          )
          .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null
      )
    },
    async criarComAuditoria({ legacyOrderNumber, idempotencyKey, now, requestedByUserId }) {
      const existing = jobs.find((job) => job.idempotencyKey === idempotencyKey)
      let job = existing
      if (!job) {
        seq += 1
        job = {
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
      }
      audits.push({
        jobId: job.id,
        legacyOrderNumber,
        idempotencyKey,
        requestedByUserId,
        now,
        requestKind: 'NEW_ATTEMPT',
        newDispatch: true,
      })
      return job
    },
    async registrarAuditoriaSolicitacao(input) {
      audits.push(input)
    },
    async registrarJobObsoleto(input) {
      obsoletos.push(input)
    },
  }
}

const NOW = new Date('2026-10-06T12:00:00.000Z')
const SOLICITANTE = 'user_vendedor'

describe('solicitarImportacao', () => {
  it('cria job para número válido e audita o solicitante', async () => {
    const repo = createFakeRepo()

    const result = await solicitarImportacao(
      { orderNumber: '70435', now: NOW, requestedByUserId: SOLICITANTE },
      repo,
    )

    expect(repo.jobs).toHaveLength(1)
    expect(repo.jobs[0].legacyOrderNumber).toBe('70435')
    expect(repo.jobs[0].idempotencyKey).toBe('pedido:70435')
    expect(repo.jobs[0].status).toBe('PENDING')
    expect(result).toEqual({ jobId: repo.jobs[0].id, reused: false })
    expect(repo.audits).toEqual([
      {
        jobId: repo.jobs[0].id,
        legacyOrderNumber: '70435',
        idempotencyKey: 'pedido:70435',
        requestedByUserId: SOLICITANTE,
        now: NOW,
        requestKind: 'NEW_ATTEMPT',
        newDispatch: true,
      },
    ])
  })

  it('rejeita número não inteiro sem criar job nem auditoria', async () => {
    const repo = createFakeRepo()

    await expect(
      solicitarImportacao({ orderNumber: '1.5', now: NOW, requestedByUserId: SOLICITANTE }, repo),
    ).rejects.toBeInstanceOf(InvalidOrderNumberError)
    expect(repo.jobs).toHaveLength(0)
    expect(repo.audits).toHaveLength(0)
  })

  it('rejeita número zero sem criar job nem auditoria', async () => {
    const repo = createFakeRepo()

    await expect(
      solicitarImportacao({ orderNumber: '0', now: NOW, requestedByUserId: SOLICITANTE }, repo),
    ).rejects.toBeInstanceOf(InvalidOrderNumberError)
    expect(repo.jobs).toHaveLength(0)
    expect(repo.audits).toHaveLength(0)
  })

  it('rejeita número negativo sem criar job nem auditoria', async () => {
    const repo = createFakeRepo()

    await expect(
      solicitarImportacao({ orderNumber: '-3', now: NOW, requestedByUserId: SOLICITANTE }, repo),
    ).rejects.toBeInstanceOf(InvalidOrderNumberError)
    expect(repo.jobs).toHaveLength(0)
    expect(repo.audits).toHaveLength(0)
  })

  it('rejeita solicitante vazio sem criar job nem auditoria', async () => {
    const repo = createFakeRepo()

    await expect(
      solicitarImportacao({ orderNumber: '70435', now: NOW, requestedByUserId: '   ' }, repo),
    ).rejects.toBeInstanceOf(SolicitanteObrigatorioError)
    expect(repo.jobs).toHaveLength(0)
    expect(repo.audits).toHaveLength(0)
  })

  it('reutiliza o job dentro da janela de 60s e audita a nova solicitação', async () => {
    const repo = createFakeRepo()
    const first = await solicitarImportacao(
      { orderNumber: '70435', now: NOW, requestedByUserId: SOLICITANTE },
      repo,
    )

    const later = new Date(NOW.getTime() + 30_000)
    const second = await solicitarImportacao(
      { orderNumber: '70435', now: later, requestedByUserId: 'user_outro' },
      repo,
    )

    expect(second).toEqual({ jobId: first.jobId, reused: true })
    expect(repo.jobs).toHaveLength(1)
    expect(repo.audits).toHaveLength(2)
    expect(repo.audits[0].requestedByUserId).toBe(SOLICITANTE)
    expect(repo.audits[1]).toMatchObject({
      jobId: first.jobId,
      legacyOrderNumber: '70435',
      requestedByUserId: 'user_outro',
      now: later,
      requestKind: 'REUSED_JOB',
      newDispatch: false,
    })
  })

  it('após a janela, reutiliza job ativo antigo sem novo despacho e audita como reutilização', async () => {
    const repo = createFakeRepo()
    const first = await solicitarImportacao(
      { orderNumber: '70435', now: NOW, requestedByUserId: SOLICITANTE },
      repo,
    )

    const after = new Date(NOW.getTime() + IDEMPOTENCY_WINDOW_MS + 1)
    const second = await solicitarImportacao(
      { orderNumber: '70435', now: after, requestedByUserId: 'user_outro' },
      repo,
    )

    expect(second).toEqual({ jobId: first.jobId, reused: true })
    expect(repo.jobs).toHaveLength(1)
    expect(repo.audits).toHaveLength(2)
    expect(repo.audits[1]).toMatchObject({
      jobId: first.jobId,
      requestedByUserId: 'user_outro',
      requestKind: 'REUSED_JOB',
      newDispatch: false,
    })
  })

  it('job ativo sem atualização além do limite aceita nova tentativa e registra o evento', async () => {
    const repo = createFakeRepo()
    const first = await solicitarImportacao(
      { orderNumber: '70435', now: NOW, requestedByUserId: SOLICITANTE },
      repo,
    )
    repo.jobs[0].status = 'RUNNING'
    repo.jobs[0].updatedAt = NOW

    const depois = new Date(NOW.getTime() + STALE_ACTIVE_JOB_MS + 1)
    const second = await solicitarImportacao(
      { orderNumber: '70435', now: depois, requestedByUserId: 'user_outro' },
      repo,
    )

    expect(second).toEqual({ jobId: first.jobId, reused: false })
    expect(repo.obsoletos).toEqual([{ jobId: first.jobId, now: depois }])
    expect(repo.audits[1]).toMatchObject({
      jobId: first.jobId,
      requestedByUserId: 'user_outro',
      requestKind: 'NEW_ATTEMPT',
      newDispatch: true,
    })
  })

  it('após a janela, job final antigo inicia nova tentativa e audita novo despacho', async () => {
    const repo = createFakeRepo()
    const first = await solicitarImportacao(
      { orderNumber: '70435', now: NOW, requestedByUserId: SOLICITANTE },
      repo,
    )
    repo.jobs[0].status = 'SUCCEEDED'

    const after = new Date(NOW.getTime() + IDEMPOTENCY_WINDOW_MS + 1)
    const second = await solicitarImportacao(
      { orderNumber: '70435', now: after, requestedByUserId: 'user_outro' },
      repo,
    )

    expect(second).toEqual({ jobId: first.jobId, reused: false })
    expect(repo.jobs).toHaveLength(1)
    expect(repo.audits).toHaveLength(2)
    expect(repo.audits[1]).toMatchObject({
      jobId: first.jobId,
      requestedByUserId: 'user_outro',
      requestKind: 'NEW_ATTEMPT',
      newDispatch: true,
    })
  })

  it('duas solicitações concorrentes do mesmo número criam um único job e duas auditorias', async () => {
    const repo = createFakeRepo()

    const [a, b] = await Promise.all([
      solicitarImportacao({ orderNumber: '70435', now: NOW, requestedByUserId: 'user_a' }, repo),
      solicitarImportacao({ orderNumber: '70435', now: NOW, requestedByUserId: 'user_b' }, repo),
    ])

    expect(repo.jobs).toHaveLength(1)
    expect(a.jobId).toBe(b.jobId)
    expect(repo.audits).toHaveLength(2)
    expect(repo.audits.map((audit) => audit.requestedByUserId)).toEqual(['user_a', 'user_b'])
  })
})
