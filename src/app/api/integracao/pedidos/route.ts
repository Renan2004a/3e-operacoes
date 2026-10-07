import { InvalidOrderNumberError } from '../../../../modules/integracao/contratos'
import { solicitarImportacao } from '../../../../modules/integracao/solicitar-importacao'
import { prismaIntegracaoRepository } from '../../../../modules/integracao/adapters/prisma-integracao-repository'
import { requireInternalToken } from '../../../../shared/http/internal-auth'
import { agendarDespacho } from '../despacho'

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
    agendarDespacho({ jobId: result.jobId, orderNumber })
  }

  return Response.json({ jobId: result.jobId }, { status: 202 })
}
