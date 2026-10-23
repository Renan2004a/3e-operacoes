import {
  IDEMPOTENCY_WINDOW_MS,
  InvalidOrderNumberError,
  buildIdempotencyKey,
  type IntegracaoRepository,
  type IntegrationJob,
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
    return await reaproveitarOuRetentar(latest, orderNumber, input, repo)
  }

  const job = await repo.create({
    legacyOrderNumber: orderNumber,
    idempotencyKey,
    now: input.now,
  })
  return { jobId: job.id, reused: false }
}

async function reaproveitarOuRetentar(
  job: IntegrationJob,
  orderNumber: string,
  input: SolicitarImportacaoInput,
  repo: IntegracaoRepository,
): Promise<SolicitarImportacaoResult> {
  if (job.status === 'FAILED') {
    // Chave estável por job falho: duas solicitações concorrentes após a mesma
    // falha apontam para o mesmo job de retry, sem herdar status/eventos.
    const retry = await repo.create({
      legacyOrderNumber: orderNumber,
      idempotencyKey: `${job.id}:retry`,
      now: input.now,
    })
    return { jobId: retry.id, reused: false }
  }

  // Tentativa recente ativa: reaproveita e não dispara outra. Job final antigo
  // (reimportação) ou ativo antigo (recuperação) sinaliza novo despacho.
  const dentroDaJanela = input.now.getTime() - job.createdAt.getTime() <= IDEMPOTENCY_WINDOW_MS
  return { jobId: job.id, reused: dentroDaJanela }
}
