import { prismaOcorrenciasRepository } from '../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import { TipoOcorrenciaInvalidoError, listarMotivos } from '../../../modules/ocorrencias/motivos'
import { autorizar } from '../../../shared/http/autorizacao'

/** GET /api/motivos?tipo= — lista os motivos ativos de um tipo (OCO-08,09, AUTH-14). */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const tipo = new URL(request.url).searchParams.get('tipo') ?? ''

  try {
    const motivos = await listarMotivos(tipo, prismaOcorrenciasRepository)
    return Response.json({ motivos }, { status: 200 })
  } catch (error) {
    if (error instanceof TipoOcorrenciaInvalidoError) {
      return Response.json({ error: 'invalid_tipo' }, { status: 400 })
    }
    throw error
  }
}
