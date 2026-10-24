import {
  IDEMPOTENCY_WINDOW_MS,
  InvalidOrderNumberError,
  buildIdempotencyKey,
  type IntegrationJob,
} from './contratos'

export interface SolicitarImportacaoInput {
  orderNumber: string
  now: Date
  /** Identidade obtida exclusivamente da sessão autenticada. */
  requestedByUserId: string
}

export interface SolicitarImportacaoResult {
  jobId: string
  /** true quando um job idempotente dentro da janela foi reaproveitado (sem novo despacho). */
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
 * devem acontecer na mesma transação de banco.
 */
export interface SolicitacaoImportacaoRepository {
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
 * A documentação (AD-015) exige o registro do solicitante, mas não fixa a
 * granularidade para repetições. Adotado: cada solicitação bem-sucedida gera
 * uma linha append-only em `logs_auditoria`; `REUSED_JOB` indica reutilização
 * dentro da janela e `NEW_ATTEMPT` indica criação/novo despacho. A autoria de
 * solicitações anteriores nunca é sobrescrita. A consolidação de repetições do
 * mesmo usuário permanece pendente de decisão (ver docs/requisitos.md).
 */
export async function solicitarImportacao(
  input: SolicitarImportacaoInput,
  repo: SolicitacaoImportacaoRepository,
): Promise<SolicitarImportacaoResult> {
  const orderNumber = parseOrderNumber(input.orderNumber)
  const requestedByUserId = parseRequestedByUserId(input.requestedByUserId)
  const idempotencyKey = buildIdempotencyKey(orderNumber)
  const since = new Date(input.now.getTime() - IDEMPOTENCY_WINDOW_MS)

  const existing = await repo.findRecentByIdempotencyKey(idempotencyKey, since)
  if (existing) {
    await repo.registrarAuditoriaSolicitacao({
      jobId: existing.id,
      legacyOrderNumber: orderNumber,
      idempotencyKey,
      requestedByUserId,
      now: input.now,
      requestKind: 'REUSED_JOB',
      newDispatch: false,
    })
    return { jobId: existing.id, reused: true }
  }

  const job = await repo.criarComAuditoria({
    legacyOrderNumber: orderNumber,
    idempotencyKey,
    now: input.now,
    requestedByUserId,
  })
  return { jobId: job.id, reused: false }
}
