export interface PedidoImportadoItem {
  legacyItemKey: string
  productCode: string | null
  description: string | null
  unit: string
  /** Decimal como string para não perder precisão. */
  requestedQuantity: string
  legacyCategory: string | null
  /** Item cancelado no legado: não entra no upsert. */
  cancelled?: boolean
}

export interface PedidoImportado {
  legacyOrderKey: string
  legacyNumber: string
  customerName: string | null
  sellerLegacyCode: string | null
  sourceUpdatedAt: Date | null
  items: PedidoImportadoItem[]
}

export interface ItemOperacionalSnapshot {
  legacyItemKey: string
  requestedQuantity: string
  executedQuantity: string
  deliveredQuantity: string
}

export interface OrderSnapshot {
  orderId: string
  items: ItemOperacionalSnapshot[]
}

export interface DivergenciaItem {
  legacyItemKey: string
  requestedQuantity: string
  executedQuantity: string
  deliveredQuantity: string
}

export interface UpsertPedidoInput {
  legacyOrderKey: string
  legacyNumber: string
  customerName: string | null
  sellerLegacyCode: string | null
  sourceUpdatedAt: Date | null
  items: Array<{
    legacyItemKey: string
    productCode: string | null
    description: string | null
    unit: string
    requestedQuantity: string
    legacyCategory: string | null
  }>
}

export interface RegistrarDivergenciaInput {
  legacyOrderKey: string
  divergencia: DivergenciaItem
}

/** Divergência de unidade: o item foi preservado com a unidade anterior. */
export interface DivergenciaUnidade {
  legacyItemKey: string
  description: string | null
  unidadeAnterior: string
  unidadeNova: string
  motivo: 'REGISTROS_OPERACIONAIS'
}

export interface UpsertPedidoResult {
  orderId: string
  divergenciasUnidade: DivergenciaUnidade[]
}

export interface PedidosRepository {
  /** Estado comercial/operacional atual do pedido, ou null se ainda não existe. */
  findOrderByLegacyKey(legacyOrderKey: string): Promise<OrderSnapshot | null>
  /**
   * Upsert transacional do pedido por `legacyOrderKey` e dos itens por
   * `(orderId, legacyItemKey)`. Não remove registros operacionais existentes.
   * Itens com mudança real de unidade e histórico operacional não são
   * atualizados; a decisão volta em `divergenciasUnidade`.
   */
  upsertOrder(input: UpsertPedidoInput): Promise<UpsertPedidoResult>
  /** Registra a divergência de quantidade detectada no `AuditLog`. */
  registrarDivergencia(input: RegistrarDivergenciaInput): Promise<void>
}

export interface ImportarPedidoResult {
  orderId: string
  /** true quando o pedido já existia e foi atualizado. */
  reimportado: boolean
  divergente: boolean
  divergencias: DivergenciaItem[]
  divergenciasUnidade: DivergenciaUnidade[]
}

export interface ClassificacaoAutomaticaItem {
  legacyItemKey: string
  legacyCategory: string | null
}

/**
 * Porta opcional de auto-classificação. Quando injetada, `importarPedido`
 * delega a classificação dos itens importados por categoria. Sem mapeamento
 * ativo o item permanece `PENDING_CLASSIFICATION`. Implementada fora do
 * domínio para não acoplar `pedidos` a `setores`.
 */
export interface ClassificacaoAutomaticaPort {
  classificarItens(input: {
    orderId: string
    items: ClassificacaoAutomaticaItem[]
  }): Promise<void>
}

function toScaled(value: string): bigint {
  const normalized = value.trim()
  const negative = normalized.startsWith('-')
  const digits = negative ? normalized.slice(1) : normalized
  const [whole = '0', fraction = ''] = digits.split('.')
  const scaled = BigInt((whole || '0') + (fraction + '000').slice(0, 3))
  return negative ? -scaled : scaled
}

export async function importarPedido(
  pedido: PedidoImportado,
  repo: PedidosRepository,
  classificacao?: ClassificacaoAutomaticaPort,
): Promise<ImportarPedidoResult> {
  const snapshot = await repo.findOrderByLegacyKey(pedido.legacyOrderKey)
  const items = pedido.items.filter((item) => item.cancelled !== true)
  const snapshotByKey = new Map((snapshot?.items ?? []).map((item) => [item.legacyItemKey, item]))

  const divergencias: DivergenciaItem[] = []
  for (const item of items) {
    const previous = snapshotByKey.get(item.legacyItemKey)
    if (!previous) continue
    const requested = toScaled(item.requestedQuantity)
    if (requested < toScaled(previous.executedQuantity) || requested < toScaled(previous.deliveredQuantity)) {
      divergencias.push({
        legacyItemKey: item.legacyItemKey,
        requestedQuantity: item.requestedQuantity,
        executedQuantity: previous.executedQuantity,
        deliveredQuantity: previous.deliveredQuantity,
      })
    }
  }

  const { orderId, divergenciasUnidade } = await repo.upsertOrder({
    legacyOrderKey: pedido.legacyOrderKey,
    legacyNumber: pedido.legacyNumber,
    customerName: pedido.customerName,
    sellerLegacyCode: pedido.sellerLegacyCode,
    sourceUpdatedAt: pedido.sourceUpdatedAt,
    items: items.map((item) => ({
      legacyItemKey: item.legacyItemKey,
      productCode: item.productCode,
      description: item.description,
      unit: item.unit,
      requestedQuantity: item.requestedQuantity,
      legacyCategory: item.legacyCategory,
    })),
  })

  if (classificacao) {
    await classificacao.classificarItens({
      orderId,
      items: items.map((item) => ({
        legacyItemKey: item.legacyItemKey,
        legacyCategory: item.legacyCategory,
      })),
    })
  }

  // Quantidades de unidades diferentes não são comparáveis: quando a unidade
  // foi preservada, a divergência de unidade é o resultado exibido.
  const chavesComUnidadePreservada = new Set(
    divergenciasUnidade.map((divergencia) => divergencia.legacyItemKey),
  )
  const divergenciasDeQuantidade = divergencias.filter(
    (divergencia) => !chavesComUnidadePreservada.has(divergencia.legacyItemKey),
  )

  for (const divergencia of divergenciasDeQuantidade) {
    await repo.registrarDivergencia({ legacyOrderKey: pedido.legacyOrderKey, divergencia })
  }

  return {
    orderId,
    reimportado: snapshot !== null,
    divergente: divergenciasDeQuantidade.length > 0 || divergenciasUnidade.length > 0,
    divergencias: divergenciasDeQuantidade,
    divergenciasUnidade,
  }
}
