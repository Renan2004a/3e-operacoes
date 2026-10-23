import {
  InvalidCallbackPayloadError,
  JobNotFoundError,
  callbackSchema,
  type CallbackPayload,
  type IntegracaoRepository,
} from './contratos'
import {
  importarPedido,
  type ClassificacaoAutomaticaPort,
  type PedidoImportado,
  type PedidosRepository,
} from '../pedidos/importar-pedido'

export interface ProcessarCallbackDeps {
  integracao: IntegracaoRepository
  pedidos: PedidosRepository
  /** Porta opcional de auto-classificação repassada à importação. */
  classificacao?: ClassificacaoAutomaticaPort
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
    const jobId =
      typeof payload === 'object' && payload !== null && 'jobId' in payload
        ? String((payload as { jobId?: unknown }).jobId ?? '')
        : ''
    console.error('[integracao] callback inválido', { jobId, campos: detail })

    // Sem isso o job ficaria em RUNNING para sempre e a tela não explicaria a
    // falha do processamento assíncrono ao usuário.
    if (jobId) {
      const agora = deps.now?.() ?? new Date()
      const job = await deps.integracao.findById(jobId).catch(() => null)
      if (job && job.status !== 'SUCCEEDED' && job.status !== 'FAILED') {
        await deps.integracao
          .updateStatus({
            jobId,
            status: 'FAILED',
            now: agora,
            errorCode: 'INVALID_CALLBACK_PAYLOAD',
            errorMessage: detail,
            completedAt: agora,
          })
          .catch(() => undefined)
        await deps.integracao
          .appendEvent({
            jobId,
            type: 'FAILED',
            detail: 'INVALID_CALLBACK_PAYLOAD',
            now: agora,
          })
          .catch(() => undefined)
      }
    }

    throw new InvalidCallbackPayloadError(detail)
  }

  const data = parsed.data
  const job = await deps.integracao.findById(data.jobId)
  if (!job) throw new JobNotFoundError(data.jobId)

  // Callback duplicado ou job já concluído: responde sem repetir o upsert.
  if (job.status === 'SUCCEEDED' || job.status === 'FAILED') return

  const now = deps.now?.() ?? new Date()

  try {
    const result = await importarPedido(toPedidoImportado(data), deps.pedidos, deps.classificacao)

    // Outro callback concorrente pode ter concluído o job enquanto este
    // processava; não duplica evento nem regride um status final.
    const atual = await deps.integracao.findById(job.id).catch(() => null)
    if (atual?.status === 'SUCCEEDED') return

    await deps.integracao.updateStatus({
      jobId: job.id,
      status: 'SUCCEEDED',
      now,
      errorCode: null,
      errorMessage: null,
      completedAt: now,
    })
    await deps.integracao.appendEvent({
      jobId: job.id,
      type: 'SUCCEEDED',
      detail: result.reimportado ? 'REIMPORTED' : 'IMPORTED',
      now,
    })

    if (result.divergente) {
      await deps.integracao.appendEvent({
        jobId: job.id,
        type: 'DIVERGENCE',
        detail: JSON.stringify(result.divergencias),
        now,
      })
    }
  } catch (error) {
    const detalhe = error instanceof Error ? error.message : String(error)
    // Mantém código e detalhe técnico para diagnóstico, sem expor o payload.
    console.error('[integracao] falha ao processar callback', {
      jobId: job.id,
      orderNumber: job.legacyOrderNumber,
      errorCode: 'UPSERT_FAILED',
      message: detalhe,
    })

    // Um callback concorrente pode já ter finalizado o job com sucesso. Nesse
    // caso a falha é tardia e não deve rebaixar o resultado já persistido.
    const atual = await deps.integracao.findById(job.id).catch(() => null)
    if (atual?.status === 'SUCCEEDED' || atual?.status === 'FAILED') {
      console.error('[integracao] falha ignorada em job já finalizado', {
        jobId: job.id,
        orderNumber: job.legacyOrderNumber,
        statusAtual: atual.status,
      })
      return
    }

    await deps.integracao.updateStatus({
      jobId: job.id,
      status: 'FAILED',
      now,
      errorCode: 'UPSERT_FAILED',
      errorMessage: detalhe,
    })
    await deps.integracao.appendEvent({ jobId: job.id, type: 'FAILED', detail: 'UPSERT_FAILED', now })
    throw error
  }
}
