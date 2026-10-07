import { prismaExpedicaoRepository } from '../../../../../modules/expedicao/adapters/prisma-expedicao-repository'
import {
  PedidoNaoEncontradoError,
  saldoPedido,
} from '../../../../../modules/expedicao/saldo-pedido'
import { requireInternalToken } from '../../../../../shared/http/internal-auth'

/** GET /api/pedidos/[orderId]/saldo — saldo consolidado do pedido (RF011, EXP-10,12). */
export async function GET(request: Request, context: { params: Promise<{ orderId: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

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
