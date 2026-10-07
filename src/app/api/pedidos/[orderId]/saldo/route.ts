import { prismaExpedicaoRepository } from '../../../../../modules/expedicao/adapters/prisma-expedicao-repository'
import {
  PedidoNaoEncontradoError,
  saldoPedido,
} from '../../../../../modules/expedicao/saldo-pedido'
import { autorizar } from '../../../../../shared/http/autorizacao'

/** GET /api/pedidos/[orderId]/saldo — saldo consolidado do pedido (RF011, EXP-10,12, AUTH-14). */
export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const { orderId } = await context.params

  try {
    const itens = await saldoPedido(orderId, prismaExpedicaoRepository)
    return Response.json({ itens }, { status: 200 })
  } catch (error) {
    if (error instanceof PedidoNaoEncontradoError) {
      return Response.json({ error: 'order_not_found' }, { status: 404 })
    }
    throw error
  }
}
