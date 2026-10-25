import {
  IDEMPOTENCY_WINDOW_MS,
  InvalidOrderNumberError,
  buildIdempotencyKey,
  type IntegrationJob,
} from './contratos'
import { statusEstaAtivo } from './resultado-solicitacao'

export interface SolicitarImportacaoInput {
  orderNumber: string
  now: Date
  /** Identidade obtida exclusivamente da sessão autenticada. */
  requestedByUserId: string
}

export interface SolicitarImportacaoResult {
  jobId: string
  /**
   * true quando um job dentro da janela ou uma tentativa ativa foi
   * reaproveitado, sem novo despacho.
   */
  reused: boolean
}

/** Evento auditado: criação de nova tentativa ou reutilização de job existente. */
export type TipoSolicitacaoImportacao = 'NEW_ATTEMPT' | 'REUSED_JOB'

export interface AuditoriaSolicitacaoImportacao {
  jobId: string
  legacyOrderNumber: string
  idempotencyKey: string
  requestedByUserId: string
  now: Date
  requestKind: TipoSolicitacaoImportacao
  newDispatch: boolean
}

/**
 * Porta usada pelo caso de uso. A criação do job e a auditoria da solicitação
 * devem acontecer na mesma transação de banco. Inclui a leitura opcional do job
 * mais recente (com `:retry`) para reimportação/recuperação.
 */
export interface SolicitacaoImportacaoRepository {
  findLatestByOrderNumberSince?(
    legacyOrderNumber: string,
    since: Date,
  ): Promise<IntegrationJob | null>
  findRecentByIdempotencyKey(idempotencyKey: string, since: Date): Promise<IntegrationJob | null>
  criarComAuditoria(input: {
    legacyOrderNumber: string
    idempotencyKey: string
    now: Date
    requestedByUserId: string
  }): Promise<IntegrationJob>
  registrarAuditoriaSolicitacao(input: AuditoriaSolicitacaoImportacao): Promise<void>
}

/** Autoria ausente: o fluxo autenticado nunca deve registrar um job sem solicitante. */
export class SolicitanteObrigatorioError extends Error {
  constructor() {
    super('O solicitante da importação é obrigatório')
    this.name = 'SolicitanteObrigatorioError'
  }
}

/** Aceita apenas inteiro positivo; devolve a forma normalizada (trim). */
function parseOrderNumber(value: string): string {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) throw new InvalidOrderNumberError(value)
  const numeric = Number(trimmed)
  if (!Number.isSafeInteger(numeric) || numeric <= 0) throw new InvalidOrderNumberError(value)
  return trimmed
}

function parseRequestedByUserId(value: string): string {
  const trimmed = value.trim()
  if (trimmed === '') throw new SolicitanteObrigatorioError()
  return trimmed
}

/**
 * Cria ou reutiliza o job idempotente e audita quem solicitou.
 *
 * Combina a leitura do job mais recente (incluindo `:retry`) com a auditoria
 * append-only da solicitação (AD-015). Cada solicitação bem-sucedida gera uma
 * linha em `logs_auditoria`: `REUSED_JOB` quando nada é despachado (dentro da
 * janela ou tentativa ativa) e `NEW_ATTEMPT` quando há novo despacho. A autoria
 * anterior nunca é sobrescrita.
 */
export async function solicitarImportacao(
  input: SolicitarImportacaoInput,
  repo: SolicitacaoImportacaoRepository,
): Promise<SolicitarImportacaoResult> {
  const orderNumber = parseOrderNumber(input.orderNumber)
  const requestedByUserId = parseRequestedByUserId(input.requestedByUserId)
  const idempotencyKey = buildIdempotencyKey(orderNumber)
  const since = new Date(input.now.getTime() - IDEMPOTENCY_WINDOW_MS)

  // O job mais recente pode ser o original ou um `:retry`. Mesmo fora da
  // janela ele é considerado: SUCCEEDED é reimportado, tentativa ativa antiga
  // pode ser recuperada e FAILED sempre ganha uma tentativa nova.
  let latest = repo.findLatestByOrderNumberSince
    ? await repo.findLatestByOrderNumberSince(orderNumber, new Date(0))
    : null

  // Compatibilidade com implementações que ainda só oferecem a consulta pela
  // chave base (sem incluir `:retry`).
  if (!latest && !repo.findLatestByOrderNumberSince) {
    latest = await repo.findRecentByIdempotencyKey(idempotencyKey, since)
  }

  if (latest) {
    return await reaproveitarOuRetentar(latest, orderNumber, requestedByUserId, input, repo)
  }

  const job = await repo.criarComAuditoria({
    legacyOrderNumber: orderNumber,
    idempotencyKey,
    now: input.now,
    requestedByUserId,
  })
  return { jobId: job.id, reused: false }
}

async function reaproveitarOuRetentar(
  job: IntegrationJob,
  orderNumber: string,
  requestedByUserId: string,
  input: SolicitarImportacaoInput,
  repo: SolicitacaoImportacaoRepository,
): Promise<SolicitarImportacaoResult> {
  if (job.status === 'FAILED') {
    // Chave estável por job falho: duas solicitações concorrentes após a mesma
    // falha apontam para o mesmo job de retry, sem herdar status/eventos.
    const retry = await repo.criarComAuditoria({
      legacyOrderNumber: orderNumber,
      idempotencyKey: `${job.id}:retry`,
      now: input.now,
      requestedByUserId,
    })
    return { jobId: retry.id, reused: false }
  }

  // Tentativa recente ativa é reutilizada mesmo fora da janela: reiniciar o
  // mesmo job em andamento criaria um segundo despacho para o conector. Job
  // final antigo (reimportação) sinaliza uma nova tentativa.
  const dentroDaJanela = input.now.getTime() - job.createdAt.getTime() <= IDEMPOTENCY_WINDOW_MS
  const reutilizado = dentroDaJanela || statusEstaAtivo(job.status)
  await repo.registrarAuditoriaSolicitacao({
    jobId: job.id,
    legacyOrderNumber: orderNumber,
    idempotencyKey: job.idempotencyKey,
    requestedByUserId,
    now: input.now,
    requestKind: reutilizado ? 'REUSED_JOB' : 'NEW_ATTEMPT',
    newDispatch: !reutilizado,
  })
  return { jobId: job.id, reused: reutilizado }
}
