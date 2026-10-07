import { prismaIndicadoresRepository } from '../../../../modules/indicadores/adapters/prisma-indicadores-repository'
import { detalharPedido } from '../../../../modules/indicadores/consulta-pedidos'
import { PedidoNaoEncontradoError } from '../../../../modules/expedicao/saldo-pedido'
import { autorizar } from '../../../../shared/http/autorizacao'

/**
 * GET /api/pedidos/[orderId] — detalha o pedido com os cinco valores por item
 * (RF008, RF011, IND-04). Pedido inexistente responde `404` (IND-10) e a rota
 * exige sessão (IND-11). Somente leitura.
 */
export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const { orderId } = await context.params

  try {
    const pedido = await detalharPedido(orderId, prismaIndicadoresRepository)
    return Response.json({ pedido }, { status: 200 })
  } catch (error) {
    if (error instanceof PedidoNaoEncontradoError) {
      return Response.json({ error: 'order_not_found' }, { status: 404 })
    }
    throw error
  }
}
