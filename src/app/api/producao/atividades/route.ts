import { listarFila } from '../../../../modules/producao/fila'
import { prismaProducaoRepository } from '../../../../modules/producao/adapters/prisma-producao-repository'
import { prismaUsuariosRepository } from '../../../../modules/usuarios/adapters/prisma-usuarios-repository'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/producao/atividades — fila de atividades dos setores do usuário da
 * sessão (PROD-01..03, AUTH-14). O gerente de produção vê todos os setores,
 * pois não possui vínculo fixo e acompanha a fábrica inteira. O cabeçalho
 * temporário `x-user-id` é ignorado.
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'registrar_execucao')
  if (!auth.autorizado) return auth.resposta

  const usuario = await prismaUsuariosRepository.findById(auth.usuario.userId)
  const todosOsSetores = usuario?.roles.includes('PRODUCTION_MANAGER') ?? false

  const atividades = await listarFila(auth.usuario.userId, prismaProducaoRepository, {
    todosOsSetores,
  })
  return Response.json({ atividades }, { status: 200 })
}
