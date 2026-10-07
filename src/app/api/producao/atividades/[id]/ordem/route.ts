import { AtividadeNaoEncontradaError } from '../../../../../../modules/producao/registrar-execucao'
import { montarOrdemProducao } from '../../../../../../modules/producao/ordem-producao'
import { prismaProducaoRepository } from '../../../../../../modules/producao/adapters/prisma-producao-repository'
import { requireInternalToken } from '../../../../../../shared/http/internal-auth'

/** GET /api/producao/atividades/[id]/ordem — dados da ordem de produção (PROD-12,13). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  try {
    const ordem = await montarOrdemProducao(id, prismaProducaoRepository)
    return Response.json({ ordem }, { status: 200 })
  } catch (error) {
    if (error instanceof AtividadeNaoEncontradaError) {
      return Response.json({ error: 'activity_not_found' }, { status: 404 })
    }
    throw error
  }
}
