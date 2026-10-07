import { JobNotFailedError, JobNotFoundError } from '../../../../../../modules/integracao/contratos'
import { reprocessar } from '../../../../../../modules/integracao/reprocessar'
import { prismaIntegracaoRepository } from '../../../../../../modules/integracao/adapters/prisma-integracao-repository'
import { requireInternalToken } from '../../../../../../shared/http/internal-auth'
import { agendarDespacho } from '../../../despacho'

/** POST /api/integracao/pedidos/[jobId]/reprocessar — reprocessa um job FAILED. */
export async function POST(request: Request, context: { params: Promise<{ jobId: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { jobId } = await context.params

  let result: Awaited<ReturnType<typeof reprocessar>>
  try {
    result = await reprocessar(jobId, prismaIntegracaoRepository)
  } catch (error) {
    if (error instanceof JobNotFoundError) {
      return Response.json({ error: 'job_not_found' }, { status: 404 })
    }
    if (error instanceof JobNotFailedError) {
      return Response.json({ error: 'job_not_failed' }, { status: 409 })
    }
    throw error
  }

  const newJob = await prismaIntegracaoRepository.findById(result.jobId)
  if (!newJob) {
    return Response.json({ error: 'job_not_found' }, { status: 404 })
  }

  agendarDespacho({ jobId: result.jobId, orderNumber: newJob.legacyOrderNumber })

  return Response.json({ jobId: result.jobId }, { status: 202 })
}
