import { listarAtividadesAtrasadas } from '../../../../modules/prazos/alertas'
import { prismaPrazosRepository } from '../../../../modules/prazos/adapters/prisma-prazos-repository'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/producao/alertas — lista as atividades atrasadas para o gerente
 * (PRAZO-10). Consulta permitida a todos os perfis autenticados.
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const alertas = await listarAtividadesAtrasadas(new Date(), prismaPrazosRepository)
  return Response.json({ alertas }, { status: 200 })
}
