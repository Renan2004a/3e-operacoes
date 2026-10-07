import { JobNotFoundError } from '../../../../../modules/integracao/contratos'
import { consultarStatus } from '../../../../../modules/integracao/consultar-status'
import { prismaIntegracaoRepository } from '../../../../../modules/integracao/adapters/prisma-integracao-repository'
import { autorizar } from '../../../../../shared/http/autorizacao'

/** GET /api/integracao/pedidos/[jobId] — status e eventos do job (AUTH-14). */
export async function GET(request: Request, context: { params: Promise<{ jobId: string }> }) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const { jobId } = await context.params

  try {
    const result = await consultarStatus(jobId, prismaIntegracaoRepository)
    return Response.json(
      { jobId: result.jobId, status: result.status, events: result.events },
      { status: result.final ? 200 : 202 },
    )
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      return Response.json({ error: 'job_not_found' }, { status: 404 })
    }
    throw error
  }
}
