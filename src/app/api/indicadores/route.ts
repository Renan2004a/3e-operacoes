import { prismaIndicadoresRepository } from '../../../modules/indicadores/adapters/prisma-indicadores-repository'
import { montarPainel } from '../../../modules/indicadores/painel'
import { montarPcp } from '../../../modules/indicadores/pcp'
import { autorizar } from '../../../shared/http/autorizacao'

/**
 * GET /api/indicadores — painel por setor/status com pendências (IND-05, IND-06)
 * e indicadores de PCP: produção por setor e cumprimento de prazo (IND-07,
 * IND-08). Calculado apenas com o banco do app (IND-09); exige sessão.
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const [painel, pcp] = await Promise.all([
    montarPainel(prismaIndicadoresRepository),
    montarPcp(prismaIndicadoresRepository),
  ])

  return Response.json({ painel, pcp }, { status: 200 })
}
