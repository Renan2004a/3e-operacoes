import { prismaOcorrenciasRepository } from '../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import { resumoOcorrencias } from '../../../../modules/ocorrencias/painel-ocorrencias'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/indicadores/ocorrencias — resumo das ocorrências para o dashboard
 * do gerente: total, últimos 7 dias, contagem por tipo e as mais recentes,
 * com pedido, item, setor e responsável (OCO-07).
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const resumo = await resumoOcorrencias(prismaOcorrenciasRepository, new Date())
  return Response.json({ resumo }, { status: 200 })
}
