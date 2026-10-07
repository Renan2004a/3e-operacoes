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
  /** Divergências a registrar em AuditLog; o adapter persiste na mesma transação. */
  divergencias: DivergenciaItem[]
}

export interface PedidosRepository {
  /** Estado comercial/operacional atual do pedido, ou null se ainda não existe. */
  findOrderByLegacyKey(legacyOrderKey: string): Promise<OrderSnapshot | null>
  /**
   * Upsert transacional do pedido por `legacyOrderKey` e dos itens por
   * `(orderId, legacyItemKey)`. Não remove registros operacionais existentes.
   */
  upsertOrder(input: UpsertPedidoInput): Promise<{ orderId: string }>
}

export interface ImportarPedidoResult {
  orderId: string
  divergente: boolean
  divergencias: DivergenciaItem[]
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

  const { orderId } = await repo.upsertOrder({
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
    divergencias,
  })

  return { orderId, divergente: divergencias.length > 0, divergencias }
}
