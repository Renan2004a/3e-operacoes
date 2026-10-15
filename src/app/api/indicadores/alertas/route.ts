import {
  DIAS_PARADO_PADRAO,
  listarAlertas,
} from '../../../../modules/indicadores/alertas'
import { prismaIndicadoresRepository } from '../../../../modules/indicadores/adapters/prisma-indicadores-repository'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/indicadores/alertas — alertas operacionais: itens **atrasados**,
 * **parados** (sem execução há `ALERTA_PARADO_DIAS`, padrão 5) e **não
 * encaminhados** (pendentes de desmembramento). Consulta para todos os perfis
 * autenticados (`consultar_pedidos`).
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const configurado = Number(process.env.ALERTA_PARADO_DIAS ?? DIAS_PARADO_PADRAO)
  const diasParado =
    Number.isInteger(configurado) && configurado > 0 ? configurado : DIAS_PARADO_PADRAO

  const alertas = await listarAlertas(prismaIndicadoresRepository, new Date(), diasParado)
  return Response.json({ alertas }, { status: 200 })
}
