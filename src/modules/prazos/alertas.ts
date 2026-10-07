import type { ActivityStatus } from '../producao/tipos'
import { calcularStatusPrazo } from './atraso'

/** Atividade com o prazo e a situação corrente, como o repositório entrega. */
export interface AtividadeComPrazo {
  id: string
  orderItemId: string
  sectorId: string
  status: ActivityStatus
  deadlineAt: Date | null
}

/** Atividade atrasada: sempre possui prazo ultrapassado (PRAZO-10). */
export interface AlertaAtraso {
  id: string
  orderItemId: string
  sectorId: string
  deadlineAt: Date
}

/** Porta de consulta das atividades com prazo (PRAZO-10). */
export interface AlertasRepository {
  listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]>
}

/**
 * Lista as atividades atrasadas: prazo conhecido, ultrapassado e não concluídas.
 * Atividades sem prazo ou já concluídas nunca aparecem (PRAZO-10).
 */
export async function listarAtividadesAtrasadas(
  agora: Date,
  repo: AlertasRepository,
): Promise<AlertaAtraso[]> {
  const atividades = await repo.listarAtividadesComPrazo()

  return atividades.flatMap((atividade) => {
    if (!atividade.deadlineAt) return []
    const status = calcularStatusPrazo({
      prazo: atividade.deadlineAt,
      concluido: atividade.status === 'COMPLETED',
      agora,
    })
    if (status !== 'ATRASADO') return []
    return [
      {
        id: atividade.id,
        orderItemId: atividade.orderItemId,
        sectorId: atividade.sectorId,
        deadlineAt: atividade.deadlineAt,
      },
    ]
  })
}
