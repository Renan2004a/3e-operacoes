import {
  IDEMPOTENCY_WINDOW_MS,
  InvalidOrderNumberError,
  buildIdempotencyKey,
  type IntegracaoRepository,
} from './contratos'

export interface SolicitarImportacaoInput {
  orderNumber: string
  now: Date
}

export interface SolicitarImportacaoResult {
  jobId: string
  /** true quando um job idempotente dentro da janela foi reaproveitado (sem novo despacho). */
  reused: boolean
}

/** Aceita apenas inteiro positivo; devolve a forma normalizada (trim). */
function parseOrderNumber(value: string): string {
  const trimmed = value.trim()
  if (!/^\d+$/.test(trimmed)) throw new InvalidOrderNumberError(value)
  const numeric = Number(trimmed)
  if (!Number.isSafeInteger(numeric) || numeric <= 0) throw new InvalidOrderNumberError(value)
  return trimmed
}

export async function solicitarImportacao(
  input: SolicitarImportacaoInput,
  repo: IntegracaoRepository,
): Promise<SolicitarImportacaoResult> {
  const orderNumber = parseOrderNumber(input.orderNumber)
  const idempotencyKey = buildIdempotencyKey(orderNumber)
  const since = new Date(input.now.getTime() - IDEMPOTENCY_WINDOW_MS)

  const existing = await repo.findRecentByIdempotencyKey(idempotencyKey, since)
  if (existing) return { jobId: existing.id, reused: true }

  const job = await repo.create({
    legacyOrderNumber: orderNumber,
    idempotencyKey,
    now: input.now,
  })
  return { jobId: job.id, reused: false }
}
