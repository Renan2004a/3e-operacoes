import { after } from 'next/server'
import { prismaIntegracaoRepository } from '../../../modules/integracao/adapters/prisma-integracao-repository'
import {
  ConectorLegadoError,
  createHttpConectorLegado,
} from '../../../modules/integracao/adapters/http-conector-legado'
import type { ConectorLegadoPort } from '../../../modules/integracao/contratos'

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

/**
 * Agenda o despacho em background após o `202`: marca `DISPATCHED`, chama o
 * conector e marca `RUNNING`. Em falha, marca `FAILED` com o `errorCode`
 * tratável (`ConectorLegadoError.code` ou `DISPATCH_FAILED`).
 */
export function agendarDespacho(input: { jobId: string; orderNumber: string }): void {
  const { jobId, orderNumber } = input

  after(async () => {
    try {
      await prismaIntegracaoRepository.updateStatus({ jobId, status: 'DISPATCHED', now: new Date() })
      await prismaIntegracaoRepository.appendEvent({ jobId, type: 'DISPATCHED', now: new Date() })
      await getConectorLegado().despachar({ jobId, orderNumber })
      await prismaIntegracaoRepository.updateStatus({ jobId, status: 'RUNNING', now: new Date() })
    } catch (error) {
      const code = error instanceof ConectorLegadoError ? error.code : 'DISPATCH_FAILED'
      const message = error instanceof Error ? error.message : String(error)
      const failedAt = new Date()
      await prismaIntegracaoRepository.updateStatus({
        jobId,
        status: 'FAILED',
        now: failedAt,
        errorCode: code,
        errorMessage: message,
        completedAt: failedAt,
      })
      await prismaIntegracaoRepository.appendEvent({
        jobId,
        type: 'FAILED',
        detail: code,
        now: failedAt,
      })
    }
  })
}
