import { prismaIntegracaoRepository } from '../../../../modules/integracao/adapters/prisma-integracao-repository'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/integracao/jobs — lista os jobs de integração com status e erros
 * para o responsável técnico (LAC-09). Exige sessão e perfil com
 * `monitorar_integracao`.
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'monitorar_integracao')
  if (!auth.autorizado) return auth.resposta

  const jobs = await prismaIntegracaoRepository.listJobs()
  return Response.json({ jobs }, { status: 200 })
}
