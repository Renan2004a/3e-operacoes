import {
  InvalidCallbackPayloadError,
  JobNotFoundError,
  callbackSchema,
  type CallbackPayload,
  type IntegracaoRepository,
} from './contratos'
import { importarPedido, type PedidoImportado, type PedidosRepository } from '../pedidos/importar-pedido'

export interface ProcessarCallbackDeps {
  integracao: IntegracaoRepository
  pedidos: PedidosRepository
  now?: () => Date
}

function toPedidoImportado(payload: CallbackPayload): PedidoImportado {
  return {
    legacyOrderKey: payload.order.legacyOrderKey,
    legacyNumber: payload.order.legacyNumber,
    customerName: payload.order.customerName,
    sellerLegacyCode: payload.order.sellerCode,
    sourceUpdatedAt: payload.order.sourceUpdatedAt ? new Date(payload.order.sourceUpdatedAt) : null,
    items: payload.items.map((item) => ({
      legacyItemKey: String(item.seq),
      productCode: item.productCode,
      description: item.description,
      unit: item.unit,
      requestedQuantity: item.requestedQuantity,
      legacyCategory: item.legacyCategory,
    })),
  }
}

export async function processarCallback(
  payload: CallbackPayload,
  deps: ProcessarCallbackDeps,
): Promise<void> {
  const parsed = callbackSchema.safeParse(payload)
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new InvalidCallbackPayloadError(detail)
  }

  const data = parsed.data
  const job = await deps.integracao.findById(data.jobId)
  if (!job) throw new JobNotFoundError(data.jobId)

  // Callback duplicado ou job já concluído: responde sem repetir o upsert.
  if (job.status === 'SUCCEEDED' || job.status === 'FAILED') return

  const now = deps.now?.() ?? new Date()

  try {
    const result = await importarPedido(toPedidoImportado(data), deps.pedidos)

    await deps.integracao.updateStatus({
      jobId: job.id,
      status: 'SUCCEEDED',
      now,
      completedAt: now,
    })
    await deps.integracao.appendEvent({ jobId: job.id, type: 'SUCCEEDED', now })

    if (result.divergente) {
      await deps.integracao.appendEvent({
        jobId: job.id,
        type: 'DIVERGENCE',
        detail: JSON.stringify(result.divergencias),
        now,
      })
    }
  } catch (error) {
    await deps.integracao.updateStatus({
      jobId: job.id,
      status: 'FAILED',
      now,
      errorCode: 'UPSERT_FAILED',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    await deps.integracao.appendEvent({ jobId: job.id, type: 'FAILED', detail: 'UPSERT_FAILED', now })
    throw error
  }
}
