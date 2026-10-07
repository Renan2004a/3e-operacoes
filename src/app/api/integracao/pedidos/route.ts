import { after } from 'next/server'
import { InvalidOrderNumberError, type ConectorLegadoPort } from '../../../../modules/integracao/contratos'
import { solicitarImportacao } from '../../../../modules/integracao/solicitar-importacao'
import { prismaIntegracaoRepository } from '../../../../modules/integracao/adapters/prisma-integracao-repository'
import {
  ConectorLegadoError,
  createHttpConectorLegado,
} from '../../../../modules/integracao/adapters/http-conector-legado'
import { requireInternalToken } from '../../../../shared/http/internal-auth'

let cachedConector: ConectorLegadoPort | null = null

function getConectorLegado(): ConectorLegadoPort {
  if (!cachedConector) {
    cachedConector = createHttpConectorLegado({
      baseUrl: process.env.LOCAL_CONNECTOR_BASE_URL ?? '',
      token: process.env.LOCAL_CONNECTOR_TOKEN ?? '',
    })
  }
  return cachedConector
}

/** POST /api/integracao/pedidos — cria o job idempotente e responde 202. */
export async function POST(request: Request) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const orderNumber =
    typeof body === 'object' && body !== null && 'orderNumber' in body
      ? (body as { orderNumber?: unknown }).orderNumber
      : undefined
  if (typeof orderNumber !== 'string') {
    return Response.json({ error: 'invalid_order_number' }, { status: 400 })
  }

  let result: Awaited<ReturnType<typeof solicitarImportacao>>
  try {
    result = await solicitarImportacao({ orderNumber, now: new Date() }, prismaIntegracaoRepository)
  } catch (error) {
    if (error instanceof InvalidOrderNumberError) {
      return Response.json({ error: 'invalid_order_number' }, { status: 400 })
    }
    throw error
  }

  if (!result.reused) {
    const { jobId } = result
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

  return Response.json({ jobId: result.jobId }, { status: 202 })
}
