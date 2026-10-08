import { after } from 'next/server'
import { prismaIntegracaoRepository } from '../../../modules/integracao/adapters/prisma-integracao-repository'
import {
  ConectorLegadoError,
  createHttpConectorLegado,
} from '../../../modules/integracao/adapters/http-conector-legado'
import type {
  ConectorLegadoPort,
  IntegracaoRepository,
} from '../../../modules/integracao/contratos'

let cachedConector: ConectorLegadoPort | null = null

/** Conector local único por processo, configurado por variáveis de ambiente. */
export function getConectorLegado(): ConectorLegadoPort {
  if (!cachedConector) {
    cachedConector = createHttpConectorLegado({
      baseUrl: process.env.LOCAL_CONNECTOR_BASE_URL ?? '',
      token: process.env.LOCAL_CONNECTOR_TOKEN ?? '',
    })
  }
  return cachedConector
}

/** Falhas transitórias que valem nova tentativa (LAC-11). */
export const CODIGOS_TRANSITORIOS = [
  'CONNECTOR_TIMEOUT',
  'CONNECTOR_UNAVAILABLE',
  'CONNECTOR_HTTP_ERROR',
] as const

export const DEFAULT_MAX_ATTEMPTS = 3
export const DEFAULT_RETRY_BACKOFF_MS = 1_000

/** Máximo de tentativas: `CONNECTOR_MAX_ATTEMPTS` quando válido, senão o padrão. */
export function resolverMaxAttempts(valor = process.env.CONNECTOR_MAX_ATTEMPTS): number {
  const n = Number(valor)
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_MAX_ATTEMPTS
}

/** Espera entre tentativas: `CONNECTOR_RETRY_BACKOFF_MS` quando válido, senão o padrão. */
export function resolverRetryBackoffMs(valor = process.env.CONNECTOR_RETRY_BACKOFF_MS): number {
  const n = Number(valor)
  return Number.isFinite(n) && n >= 0 ? n : DEFAULT_RETRY_BACKOFF_MS
}

/** Indica se o código é uma falha transitória do conector (LAC-11). */
export function erroTransitorio(code: string): boolean {
  return (CODIGOS_TRANSITORIOS as readonly string[]).includes(code)
}

export interface DespachoDeps {
  repo: IntegracaoRepository
  conector: ConectorLegadoPort
  maxAttempts?: number
  backoffMs?: number
  sleep?: (ms: number) => Promise<void>
  now?: () => Date
}

/**
 * Despacha o job ao conector com retry/backoff para falhas transitórias
 * (LAC-11, LAC-12, LAC-13): marca `DISPATCHED`, tenta até `maxAttempts` e, em
 * sucesso, marca `RUNNING`. Erros definitivos marcam `FAILED` sem repetir. Cada
 * tentativa frustrada que gera nova tentativa é registrada em evento `RETRY`.
 */
export async function despacharComRetry(
  input: { jobId: string; orderNumber: string },
  deps: DespachoDeps,
): Promise<void> {
  const { jobId, orderNumber } = input
  const { repo, conector } = deps
  const maxAttempts = deps.maxAttempts ?? resolverMaxAttempts()
  const backoffMs = deps.backoffMs ?? resolverRetryBackoffMs()
  const sleep = deps.sleep ?? ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const now = deps.now ?? (() => new Date())

  await repo.updateStatus({ jobId, status: 'DISPATCHED', now: now() })
  await repo.appendEvent({ jobId, type: 'DISPATCHED', now: now() })

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await conector.despachar({ jobId, orderNumber })
      await repo.updateStatus({ jobId, status: 'RUNNING', now: now() })
      return
    } catch (error) {
      const code = error instanceof ConectorLegadoError ? error.code : 'DISPATCH_FAILED'
      const message = error instanceof Error ? error.message : String(error)
      const transitorio = error instanceof ConectorLegadoError && erroTransitorio(code)

      if (!transitorio || attempt >= maxAttempts) {
        const failedAt = now()
        await repo.updateStatus({
          jobId,
          status: 'FAILED',
          now: failedAt,
          errorCode: code,
          errorMessage: message,
          completedAt: failedAt,
        })
        await repo.appendEvent({ jobId, type: 'FAILED', detail: code, now: failedAt })
        return
      }

      await repo.appendEvent({
        jobId,
        type: 'RETRY',
        detail: `${code} (tentativa ${attempt}/${maxAttempts})`,
        now: now(),
      })
      await sleep(backoffMs)
    }
  }
}

/**
 * Agenda o despacho em background após o `202`, com retry/backoff antes de
 * marcar `FAILED` (LAC-11).
 */
export function agendarDespacho(input: { jobId: string; orderNumber: string }): void {
  after(async () => {
    await despacharComRetry(input, {
      repo: prismaIntegracaoRepository,
      conector: getConectorLegado(),
    })
  })
}
