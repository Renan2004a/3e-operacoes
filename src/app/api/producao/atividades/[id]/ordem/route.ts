import { AtividadeNaoEncontradaError } from '../../../../../../modules/producao/registrar-execucao'
import { montarOrdemProducao } from '../../../../../../modules/producao/ordem-producao'
import { prismaProducaoRepository } from '../../../../../../modules/producao/adapters/prisma-producao-repository'
import { autorizar } from '../../../../../../shared/http/autorizacao'

/** GET /api/producao/atividades/[id]/ordem — dados da ordem de produção (PROD-12,13, AUTH-14). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

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
