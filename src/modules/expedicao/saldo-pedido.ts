import { calcularSaldo } from '../producao/saldo'
import type { Quantidade } from '../producao/unidades'
import { calcularDisponivel } from './disponibilidade'

export interface ItemDoPedido {
  id: string
  solicitado: Quantidade
  executado: Quantidade
  entregue: Quantidade
}

export interface SaldoPedidoRepository {
  /** Itens do pedido com solicitado/executado/entregue, ou null se o pedido não existir. */
  buscarItensDoPedido(orderId: string): Promise<ItemDoPedido[] | null>
}

export interface ItemSaldo {
  itemId: string
  solicitado: Quantidade
  executado: Quantidade
  disponivel: Quantidade
  entregue: Quantidade
  pendente: Quantidade
}

export class PedidoNaoEncontradoError extends Error {
  constructor(orderId: string) {
    super(`Pedido não encontrado: ${orderId}`)
    this.name = 'PedidoNaoEncontradoError'
  }
}

/**
 * Saldo consolidado do pedido: por item, solicitado, executado, disponível,
 * entregue e pendente (RF011, EXP-10). Pendente de produção = solicitado −
 * executado (RN001) e disponível = executado conforme − entregue (RN002).
 */
export async function saldoPedido(
  orderId: string,
  repo: SaldoPedidoRepository,
): Promise<ItemSaldo[]> {
  const itens = await repo.buscarItensDoPedido(orderId)
  if (!itens) throw new PedidoNaoEncontradoError(orderId)

  return itens.map((item) => {
    const { pendente } = calcularSaldo({
      solicitado: item.solicitado,
      executado: item.executado,
    })
    const disponivel = calcularDisponivel({
      executado: item.executado,
      entregue: item.entregue,
    })
    return {
      itemId: item.id,
      solicitado: item.solicitado,
      executado: item.executado,
      disponivel,
      entregue: item.entregue,
      pendente,
    }
  })
}
