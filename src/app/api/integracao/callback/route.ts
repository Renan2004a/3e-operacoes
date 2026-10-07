import {
  InvalidCallbackPayloadError,
  JobNotFoundError,
  type CallbackPayload,
} from '../../../../modules/integracao/contratos'
import { processarCallback } from '../../../../modules/integracao/processar-callback'
import { prismaIntegracaoRepository } from '../../../../modules/integracao/adapters/prisma-integracao-repository'
import { prismaPedidosRepository } from '../../../../modules/pedidos/adapters/prisma-pedidos-repository'
import { requireCallbackToken } from '../../../../shared/http/internal-auth'

/** POST /api/integracao/callback — recebe o payload normalizado do conector. */
export async function POST(request: Request) {
  if (!requireCallbackToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    await processarCallback(body as CallbackPayload, {
      integracao: prismaIntegracaoRepository,
      pedidos: prismaPedidosRepository,
    })
    return Response.json({ ok: true }, { status: 200 })
  } catch (error) {
    if (error instanceof InvalidCallbackPayloadError) {
      return Response.json({ error: 'invalid_payload' }, { status: 400 })
    }
    if (error instanceof JobNotFoundError) {
      return Response.json({ error: 'job_not_found' }, { status: 404 })
    }
    return Response.json({ error: 'processing_failed' }, { status: 500 })
  }
}
