import type { ActivityStatus } from '../producao/tipos'
import {
  PedidoNaoEncontradoError,
  saldoPedido,
  type ItemSaldo,
  type SaldoPedidoRepository,
} from '../expedicao/saldo-pedido'

/**
 * Situação consolidada do pedido, derivada das atividades dos seus itens.
 * O pedido não possui status próprio no banco do app (IND-01).
 */
export type StatusPedido = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface AtividadeDoPedido {
  sectorId: string
  status: ActivityStatus
}

/** Pedido como o repositório entrega para consulta: cabeçalho e atividades. */
export interface PedidoConsultado {
  id: string
  numero: string
  cliente: string | null
  criadoEm: Date
  atividades: AtividadeDoPedido[]
}

export interface FiltrosPedido {
  /** Trecho do nome do cliente, sem diferenciar maiúsculas. */
  cliente?: string
  /** Id do setor; mantém pedidos com alguma atividade nesse setor. */
  setor?: string
  status?: StatusPedido
  /** Início do período, inclusive, sobre a data de criação do pedido. */
  de?: Date
  /** Fim do período, inclusive. */
  ate?: Date
  limite?: number
  offset?: number
}

export interface PedidoListado {
  id: string
  numero: string
  cliente: string | null
  status: StatusPedido
}

export interface CabecalhoPedido {
  id: string
  numero: string
  cliente: string | null
}

export interface PedidoDetalhado extends CabecalhoPedido {
  itens: ItemSaldo[]
}

/**
 * Porta de consulta de pedidos. Reusa o saldo da expedição para o detalhe
 * (IND-04). Somente leitura (RF008).
 */
export interface ConsultaPedidosRepository extends SaldoPedidoRepository {
  /** Todos os pedidos com suas atividades, base para filtro e status (IND-01, IND-02). */
  listarPedidosParaConsulta(): Promise<PedidoConsultado[]>
  /** Cabeçalho do pedido, ou null se não existir (IND-10). */
  buscarCabecalhoPedido(orderId: string): Promise<CabecalhoPedido | null>
}

const LIMITE_PADRAO = 20
const OFFSET_PADRAO = 0

/**
 * Status do pedido a partir das atividades dos itens: sem atividades ou todas
 * pendentes → `PENDING`; todas concluídas → `COMPLETED`; caso contrário →
 * `IN_PROGRESS` (IND-01).
 */
export function statusDoPedido(atividades: readonly AtividadeDoPedido[]): StatusPedido {
  if (atividades.length === 0) return 'PENDING'
  if (atividades.every((atividade) => atividade.status === 'COMPLETED')) return 'COMPLETED'
  if (atividades.every((atividade) => atividade.status === 'PENDING')) return 'PENDING'
  return 'IN_PROGRESS'
}

function clienteContem(cliente: string | null, filtro: string): boolean {
  return cliente !== null && cliente.toLowerCase().includes(filtro.trim().toLowerCase())
}

function dentroDoPeriodo(pedido: PedidoConsultado, de?: Date, ate?: Date): boolean {
  if (de && pedido.criadoEm.getTime() < de.getTime()) return false
  if (ate && pedido.criadoEm.getTime() > ate.getTime()) return false
  return true
}

/**
 * Lista os pedidos aplicando os filtros de cliente, setor, status e período e a
 * paginação por limite/offset (IND-01, IND-02, IND-03).
 */
export async function listarPedidos(
  filtros: FiltrosPedido,
  repo: ConsultaPedidosRepository,
): Promise<PedidoListado[]> {
  const pedidos = await repo.listarPedidosParaConsulta()
  const limite = filtros.limite ?? LIMITE_PADRAO
  const offset = filtros.offset ?? OFFSET_PADRAO

  return pedidos
    .filter((pedido) => !filtros.cliente?.trim() || clienteContem(pedido.cliente, filtros.cliente))
    .filter((pedido) => !filtros.setor || pedido.atividades.some((a) => a.sectorId === filtros.setor))
    .filter((pedido) => !filtros.status || statusDoPedido(pedido.atividades) === filtros.status)
    .filter((pedido) => dentroDoPeriodo(pedido, filtros.de, filtros.ate))
    .slice(offset, offset + limite)
    .map((pedido) => ({
      id: pedido.id,
      numero: pedido.numero,
      cliente: pedido.cliente,
      status: statusDoPedido(pedido.atividades),
    }))
}

/**
 * Detalha um pedido com os cinco valores por item (IND-04). Reusa o saldo da
 * expedição; pedido inexistente é rejeitado (IND-10).
 */
export async function detalharPedido(
  orderId: string,
  repo: ConsultaPedidosRepository,
): Promise<PedidoDetalhado> {
  const itens = await saldoPedido(orderId, repo)
  const cabecalho = await repo.buscarCabecalhoPedido(orderId)
  if (!cabecalho) throw new PedidoNaoEncontradoError(orderId)
  return { ...cabecalho, itens }
}
