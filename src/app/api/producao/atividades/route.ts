import { listarFila } from '../../../../modules/producao/fila'
import { prismaProducaoRepository } from '../../../../modules/producao/adapters/prisma-producao-repository'
import { requireInternalToken } from '../../../../shared/http/internal-auth'

/**
 * GET /api/producao/atividades — fila de atividades dos setores do usuário
 * (PROD-01..03). Enquanto a feature de autenticação não existe, o usuário
 * atual vem do cabeçalho temporário `x-user-id`.
 */
export async function GET(request: Request) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const usuarioId = request.headers.get('x-user-id') ?? ''
  const atividades = await listarFila(usuarioId, prismaProducaoRepository)
  return Response.json({ atividades }, { status: 200 })
}
