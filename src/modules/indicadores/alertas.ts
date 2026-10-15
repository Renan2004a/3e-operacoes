import type { ActivityStatus } from '../producao/tipos'

/** Tipo de alerta operacional (PRAZO-10 + itens não encaminhados/parados). */
export type TipoAlerta = 'ATRASADO' | 'PARADO' | 'NAO_ENCAMINHADO'

export interface Alerta {
  tipo: TipoAlerta
  orderId: string
  orderNumber: string
  itemId: string
  itemDescription: string | null
  sectorName: string | null
  /** Texto curto do motivo (ex.: "Prazo vencido em 24/12/2024"). */
  detail: string
}

/** Item como o repositório entrega para a montagem dos alertas. */
export interface ItemParaAlerta {
  itemId: string
  orderId: string
  orderNumber: string
  itemDescription: string | null
  classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  activityId: string | null
  activityStatus: ActivityStatus | null
  sectorName: string | null
  activityCreatedAt: Date | null
  deadlineAt: Date | null
  lastExecutionAt: Date | null
}

export interface AlertasRepository {
  listarItensParaAlerta(): Promise<ItemParaAlerta[]>
}

export interface AlertasResumo {
  atrasados: Alerta[]
  parados: Alerta[]
  naoEncaminhados: Alerta[]
}

const DIA_MS = 24 * 60 * 60 * 1000
/** Dias sem movimentação para considerar uma atividade parada (padrão). */
export const DIAS_PARADO_PADRAO = 5

function formatarData(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data)
}

/**
 * Monta os alertas a partir dos itens: **atrasados** (prazo vencido e não
 * concluído), **parados** (sem execução há N dias) e **não encaminhados**
 * (pendentes de desmembramento ou sem atividade no setor).
 */
export function montarAlertas(
  itens: readonly ItemParaAlerta[],
  agora: Date,
  diasParado = DIAS_PARADO_PADRAO,
): AlertasResumo {
  const atrasados: Alerta[] = []
  const parados: Alerta[] = []
  const naoEncaminhados: Alerta[] = []

  for (const item of itens) {
    const base = {
      orderId: item.orderId,
      orderNumber: item.orderNumber,
      itemId: item.itemId,
      itemDescription: item.itemDescription,
      sectorName: item.sectorName,
    }

    if (item.classificationStatus === 'PENDING_CLASSIFICATION' || !item.activityId) {
      naoEncaminhados.push({
        ...base,
        tipo: 'NAO_ENCAMINHADO',
        detail: 'Item ainda não encaminhado ao setor',
      })
      continue
    }

    const concluida = item.activityStatus === 'COMPLETED'

    if (!concluida && item.deadlineAt && item.deadlineAt.getTime() < agora.getTime()) {
      atrasados.push({
        ...base,
        tipo: 'ATRASADO',
        detail: `Prazo vencido em ${formatarData(item.deadlineAt)}`,
      })
    }

    if (!concluida) {
      const referencia = item.lastExecutionAt ?? item.activityCreatedAt
      if (referencia) {
        const dias = Math.floor((agora.getTime() - referencia.getTime()) / DIA_MS)
        if (dias >= diasParado) {
          parados.push({
            ...base,
            tipo: 'PARADO',
            detail: `Sem movimentação há ${dias} dia(s)`,
          })
        }
      }
    }
  }

  return { atrasados, parados, naoEncaminhados }
}

/** Lê os itens do repositório e monta o resumo de alertas. */
export async function listarAlertas(
  repo: AlertasRepository,
  agora: Date,
  diasParado = DIAS_PARADO_PADRAO,
): Promise<AlertasResumo> {
  return montarAlertas(await repo.listarItensParaAlerta(), agora, diasParado)
}
