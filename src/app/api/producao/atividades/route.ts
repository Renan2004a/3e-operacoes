import { listarFila } from '../../../../modules/producao/fila'
import { prismaProducaoRepository } from '../../../../modules/producao/adapters/prisma-producao-repository'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/producao/atividades — fila de atividades dos setores do usuário da
 * sessão (PROD-01..03, AUTH-14). O cabeçalho temporário `x-user-id` é ignorado.
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'registrar_execucao')
  if (!auth.autorizado) return auth.resposta

  const atividades = await listarFila(auth.usuario.userId, prismaProducaoRepository)
  return Response.json({ atividades }, { status: 200 })
}
