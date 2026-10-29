import type { StatusPrazo } from '../prazos/atraso'
import { calcularStatusPrazoEntrega } from '../prazos/status-prazo-entrega'
import type { ActivityStatus } from '../producao/tipos'
import { agruparPorUnidade, somarQuantidades } from '../producao/totais-por-unidade'
import type { Quantidade } from '../producao/unidades'
import type { CodigoSetor } from '../setores/codigos-setor'
import { motivoBloqueioCorrecao, type RegistrosDaAtividade } from '../setores/corrigir-setor'
import { sugerirSetor, type RegraProdutoSetor } from '../setores/sugerir-setor'
import {
  PedidoNaoEncontradoError,
  saldoPedido,
  type ItemSaldo,
  type SaldoPedidoRepository,
} from '../expedicao/saldo-pedido'

/**
 * Situação consolidada do pedido, derivada dos itens ativos e das atividades.
 * O pedido não possui status próprio no banco do app (IND-01).
 */
export type StatusPedido = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

/** Situação de classificação do item (LAC-04, LAC-05). */
export type StatusClassificacaoItem = 'CLASSIFIED' | 'PENDING_CLASSIFICATION'

export interface AtividadeDoPedido {
  sectorCode: CodigoSetor
  status: ActivityStatus
}

/**
 * Item como o repositório entrega para a consulta. A classificação é necessária
 * porque item ativo sem desmembramento não pode concluir a produção (AD-013).
 */
export interface ItemDoPedidoConsultado {
  classificationStatus: StatusClassificacaoItem
  atividades: AtividadeDoPedido[]
  /** Prazo de entrega do item, usado para a previsão do pedido (AD-009). */
  deadlineAt?: Date | null
}

/** Pedido como o repositório entrega para consulta: cabeçalho e itens. */
export interface PedidoConsultado {
  id: string
  numero: string
  cliente: string | null
  criadoEm: Date
  itens: ItemDoPedidoConsultado[]
}

export interface FiltrosPedido {
  /** Trecho do número comercial do pedido (legacyNumber), sem espaços nas bordas. */
  numero?: string
  /** Trecho do nome do cliente, sem diferenciar maiúsculas. */
  cliente?: string
  /** Código do setor; mantém pedidos com alguma atividade nesse setor. */
  setor?: CodigoSetor
  status?: StatusPedido
  /** Início do período, inclusive, sobre a data de criação do pedido. */
  de?: Date
  /** Fim do período, exclusivo (início do dia seguinte ao último dia selecionado). */
  ate?: Date
  limite?: number
  offset?: number
}

export interface PedidoListado {
  id: string
  numero: string
  cliente: string | null
  status: StatusPedido
  /** Maior prazo de entrega entre os itens; null quando nenhum item tem prazo. */
  previsao: Date | null
  /** Alguma atividade do pedido foi marcada como divergente e precisa de análise. */
  divergente: boolean
}

/**
 * Paginação aplicada no banco (A1). `total` é a contagem de pedidos que
 * atendem aos filtros, não o tamanho da página.
 */
export interface PaginacaoPedidos {
  limite: number
  offset: number
  pagina: number
  total: number
  totalPaginas: number
}

/** Página de pedidos e seus metadados de paginação. */
export interface PaginaDePedidos {
  pedidos: PedidoListado[]
  paginacao: PaginacaoPedidos
}

/** Critérios já normalizados entregues ao repositório (filtros + paginação). */
export interface ConsultaPedidosCriterios extends FiltrosPedido {
  limite: number
  offset: number
}

/** Página devolvida pelo repositório: linhas da página e total com os filtros. */
export interface ResultadoConsultaPedidos {
  pedidos: PedidoConsultado[]
  total: number
}

export interface CabecalhoPedido {
  id: string
  numero: string
  cliente: string | null
  customerName: string | null
  sellerLegacyCode: string | null
}

/** Remessa programada do item, exibida no detalhe (entrega escalonada). */
export interface RemessaProgramada {
  id: string
  remessa: number
  scheduledAt: Date
  confirmedAt: Date | null
}

/** Especificações de exibição do item, além do saldo (IND-04). */
export interface EspecificacaoItem {
  itemId: string
  description: string | null
  productCode: string | null
  unit: string
  /** Prazo de entrega do item (`OrderItem.deadlineAt`), quando definido (AD-009). */
  deadlineAt?: Date | null
  /** Prazo operacional da atividade do setor (`Activity.deadlineAt`), quando definido (AD-009). */
  activityDeadlineAt?: Date | null
  /** Situação de classificação do item, base da classificação manual (LAC-04). */
  classificationStatus: StatusClassificacaoItem
  /** Categoria do produto no legado, usada para aprender o de/para categoria→setor. */
  legacyCategory?: string | null
  /** Setor da atividade do item, para o desmembramento. */
  sectorId?: string | null
  sectorCode?: string | null
  sectorName?: string | null
  activityStatus?: ActivityStatus | null
  /** Registros da atividade que podem impedir a correção de setor (AD-007). */
  registrosAtividade?: RegistrosDaAtividade | null
  /** Entregas programadas (remessas) do item. */
  remessas?: RemessaProgramada[]
}

/** Item do detalhe: saldo consolidado + descrição, código e unidade (IND-04). */
export interface ItemDetalhado extends ItemSaldo {
  description: string | null
  productCode: string | null
  unit: string
  /** Prazo de entrega do item, ou `null` quando não definido (AD-009). */
  deadlineAt: Date | null
  /** Prazo operacional do setor, ou `null` quando não definido (AD-009, D5). */
  activityDeadlineAt: Date | null
  /**
   * Status comercial do prazo de entrega, derivado na leitura e sem
   * persistência (AD-025). Não confundir com o prazo operacional da atividade.
   */
  statusPrazoEntrega: StatusPrazo
  classificationStatus: StatusClassificacaoItem
  /** Categoria do produto no legado (para aprender o de/para categoria→setor). */
  legacyCategory?: string | null
  sectorId?: string | null
  sectorCode?: string | null
  sectorName?: string | null
  activityStatus?: ActivityStatus | null
  /** Setor sugerido pelas regras produto→setor, para pré-seleção (LAC-04). */
  suggestedSectorId?: string | null
  /**
   * Motivo que impede a correção de setor do item, ou null quando ela é permitida.
   * Só existe para itens desmembrados (AD-007).
   */
  bloqueioCorrecaoSetor?: string | null
  /** Entregas programadas (remessas) do item. */
  remessas?: RemessaProgramada[]
}

/**
 * Totais de um grupo de itens com a mesma unidade de medida (RN01, RN02). Não
 * existe total geral entre unidades diferentes.
 */
export interface TotaisPorUnidade {
  /** Unidade do grupo, ou `null` quando os itens não têm unidade informada (RN05). */
  unidade: string | null
  itens: number
  solicitado: Quantidade
  executado: Quantidade
  disponivel: Quantidade
  entregue: Quantidade
  pendente: Quantidade
}

export interface PedidoDetalhado extends CabecalhoPedido {
  itens: ItemDetalhado[]
  totaisPorUnidade: TotaisPorUnidade[]
}

/**
 * Porta de consulta de pedidos. Reusa o saldo da expedição para o detalhe
 * (IND-04). Somente leitura (RF008).
 */
export interface ConsultaPedidosRepository extends SaldoPedidoRepository {
  /**
   * Página de pedidos com filtros aplicados no banco, ordenada por criação
   * decrescente e id crescente, e total de pedidos que atendem aos filtros
   * (IND-01, IND-02, QF-07). Não carrega todos os pedidos em memória.
   */
  consultarPedidos(criterios: ConsultaPedidosCriterios): Promise<ResultadoConsultaPedidos>
  /** Cabeçalho do pedido, ou null se não existir (IND-10). */
  buscarCabecalhoPedido(orderId: string): Promise<CabecalhoPedido | null>
  /** Descrição, código e unidade de cada item, para exibição no detalhe (IND-04). */
  buscarEspecificacoesDosItens(orderId: string): Promise<EspecificacaoItem[]>
  /** Regras produto→setor para sugerir o setor de cada item (LAC-04). */
  listarRegrasProdutoSetor(): Promise<RegraProdutoSetor[]>
}

/** Limite padrão quando o filtro não informa um valor (QF-07). */
const LIMITE_PADRAO = 20
/** Teto do limite para não sobrecarregar a resposta (QF-07). */
const LIMITE_MAXIMO = 100
/** Offset padrão quando o filtro não informa um valor (QF-07). */
const OFFSET_PADRAO = 0

/**
 * Normaliza a paginação: limite padrão quando ausente, limitado a
 * `[1, LIMITE_MAXIMO]`; offset padrão quando ausente, nunca negativo (QF-07).
 */
function normalizarPaginacao(filtros: FiltrosPedido): { limite: number; offset: number } {
  const limite = Math.min(Math.max(filtros.limite ?? LIMITE_PADRAO, 1), LIMITE_MAXIMO)
  const offset = Math.max(filtros.offset ?? OFFSET_PADRAO, 0)
  return { limite, offset }
}

/**
 * Situação de um item ativo. Só é `COMPLETED` quando o item foi desmembrado e
 * todas as suas atividades foram concluídas; item não classificado nunca conta
 * como produção concluída (AD-013). Sem atividades, o item é considerado não
 * iniciado, e não concluído.
 */
function situacaoDoItem(item: ItemDoPedidoConsultado): StatusPedido {
  const concluido =
    item.classificationStatus === 'CLASSIFIED' &&
    item.atividades.length > 0 &&
    item.atividades.every((atividade) => atividade.status === 'COMPLETED')
  if (concluido) return 'COMPLETED'
  if (item.atividades.every((atividade) => atividade.status === 'PENDING')) return 'PENDING'
  return 'IN_PROGRESS'
}

/**
 * Status do pedido a partir de todos os itens ativos, inclusive os ainda não
 * desmembrados (AD-013): todos concluídos → `COMPLETED`; todos não iniciados →
 * `PENDING`; caso contrário → `IN_PROGRESS`. Pedido sem itens permanece
 * `PENDING`, preservando o comportamento anterior. O cancelamento lógico de
 * item (AD-010) ainda não tem campo/contrato; por isso não há item inativo a
 * excluir deste cálculo.
 */
export function statusDoPedido(itens: readonly ItemDoPedidoConsultado[]): StatusPedido {
  if (itens.length === 0) return 'PENDING'
  const situacoes = itens.map(situacaoDoItem)
  if (situacoes.every((situacao) => situacao === 'COMPLETED')) return 'COMPLETED'
  if (situacoes.every((situacao) => situacao === 'PENDING')) return 'PENDING'
  return 'IN_PROGRESS'
}

/**
 * Lista uma página de pedidos. Os filtros de número comercial, cliente, setor,
 * status e período, a ordenação (criação decrescente, id crescente) e a
 * paginação são aplicados no banco (IND-01, IND-02, IND-03, QF-07, A1).
 * O status exibido é derivado de todos os itens ativos de cada pedido da página.
 */
export async function listarPedidos(
  filtros: FiltrosPedido,
  repo: ConsultaPedidosRepository,
): Promise<PaginaDePedidos> {
  const { limite, offset } = normalizarPaginacao(filtros)
  const { pedidos, total } = await repo.consultarPedidos({
    numero: filtros.numero?.trim() || undefined,
    cliente: filtros.cliente?.trim() || undefined,
    setor: filtros.setor,
    status: filtros.status,
    de: filtros.de,
    ate: filtros.ate,
    limite,
    offset,
  })

  return {
    pedidos: pedidos.map((pedido) => ({
      id: pedido.id,
      numero: pedido.numero,
      cliente: pedido.cliente,
      status: statusDoPedido(pedido.itens),
      // Previsão do pedido: o prazo mais distante entre os itens, pois o
      // pedido só está completo quando o último item também é entregue.
      previsao: pedido.itens.reduce<Date | null>((maior, item) => {
        if (!item.deadlineAt) return maior
        return !maior || item.deadlineAt > maior ? item.deadlineAt : maior
      }, null),
      divergente: pedido.itens.some((item) =>
        item.atividades.some((atividade) => atividade.status === 'DIVERGENT'),
      ),
    })),
    paginacao: {
      limite,
      offset,
      pagina: Math.floor(offset / limite) + 1,
      total,
      totalPaginas: Math.ceil(total / limite),
    },
  }
}

/**
 * Soma os valores de cada grupo de unidade. Itens de unidades diferentes ficam
 * em grupos separados e nunca são somados entre si (RN01, RN02, RN03).
 */
export function totalizarPorUnidade(itens: readonly ItemDetalhado[]): TotaisPorUnidade[] {
  return agruparPorUnidade(itens, (item) => item.unit).map((grupo) => ({
    unidade: grupo.unidade,
    itens: grupo.itens.length,
    solicitado: somarQuantidades(grupo.itens.map((item) => item.solicitado)),
    executado: somarQuantidades(grupo.itens.map((item) => item.executado)),
    disponivel: somarQuantidades(grupo.itens.map((item) => item.disponivel)),
    entregue: somarQuantidades(grupo.itens.map((item) => item.entregue)),
    pendente: somarQuantidades(grupo.itens.map((item) => item.pendente)),
  }))
}

/**
 * Detalha um pedido com os cinco valores por item, as especificações de
 * exibição (descrição, código e unidade por item; cliente/vendedor do pedido)
 * e os totais por unidade de medida (IND-04). Reusa o saldo da expedição;
 * pedido inexistente é rejeitado (IND-10).
 */
export async function detalharPedido(
  orderId: string,
  repo: ConsultaPedidosRepository,
  agora: Date = new Date(),
): Promise<PedidoDetalhado> {
  const itens = await saldoPedido(orderId, repo)
  const cabecalho = await repo.buscarCabecalhoPedido(orderId)
  if (!cabecalho) throw new PedidoNaoEncontradoError(orderId)

  const especificacoes = await repo.buscarEspecificacoesDosItens(orderId)
  const porItem = new Map(
    especificacoes.map((especificacao) => [especificacao.itemId, especificacao]),
  )
  const regras = await repo.listarRegrasProdutoSetor()

  const itensDetalhados = itens.map((item): ItemDetalhado => {
    const especificacao = porItem.get(item.itemId)
    const suggestionavel = {
      productCode: especificacao?.productCode ?? null,
      description: especificacao?.description ?? null,
    }
    return {
      ...item,
      description: especificacao?.description ?? null,
      productCode: especificacao?.productCode ?? null,
      unit: especificacao?.unit ?? '',
      deadlineAt: especificacao?.deadlineAt ?? null,
      activityDeadlineAt: especificacao?.activityDeadlineAt ?? null,
      statusPrazoEntrega: calcularStatusPrazoEntrega({
        prazo: especificacao?.deadlineAt ?? null,
        solicitado: item.solicitado,
        entregue: item.entregue,
        agora,
      }),
      classificationStatus: especificacao?.classificationStatus ?? 'PENDING_CLASSIFICATION',
      legacyCategory: especificacao?.legacyCategory ?? null,
      sectorId: especificacao?.sectorId ?? null,
      sectorCode: especificacao?.sectorCode ?? null,
      sectorName: especificacao?.sectorName ?? null,
      activityStatus: especificacao?.activityStatus ?? null,
      suggestedSectorId:
        especificacao?.classificationStatus === 'CLASSIFIED'
          ? null
          : sugerirSetor(suggestionavel, regras),
      bloqueioCorrecaoSetor:
        especificacao?.classificationStatus === 'CLASSIFIED'
          ? motivoBloqueioCorrecao(especificacao.registrosAtividade ?? null)
          : null,
      remessas: especificacao?.remessas ?? [],
    }
  })

  return {
    ...cabecalho,
    itens: itensDetalhados,
    totaisPorUnidade: totalizarPorUnidade(itensDetalhados),
  }
}
