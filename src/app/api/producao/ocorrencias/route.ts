import { prismaOcorrenciasRepository } from '../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import { listarOcorrenciasDoUsuario } from '../../../../modules/ocorrencias/painel-ocorrencias'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/producao/ocorrencias — ocorrências registradas pelo próprio usuário
 * da sessão, com pedido, item, setor, motivo e data/hora (OCO-07).
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'registrar_ocorrencia')
  if (!auth.autorizado) return auth.resposta

  const ocorrencias = await listarOcorrenciasDoUsuario(
    auth.usuario.userId,
    prismaOcorrenciasRepository,
  )
  return Response.json({ ocorrencias }, { status: 200 })
}
