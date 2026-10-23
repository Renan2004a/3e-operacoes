import type { JobStatus } from './contratos'

/**
 * Como a solicitação atual se relaciona com o processamento no Top Gerente:
 * - NOVA: um novo despacho foi agendado;
 * - EM_ANDAMENTO: uma tentativa ativa recente foi reaproveitada;
 * - RESULTADO_ANTERIOR: o resultado recente foi reaproveitado sem nova consulta.
 */
export type OrigemSolicitacao = 'NOVA' | 'EM_ANDAMENTO' | 'RESULTADO_ANTERIOR'

const STATUS_ATIVOS: readonly JobStatus[] = ['PENDING', 'DISPATCHED', 'RUNNING']

export function statusEstaAtivo(status: JobStatus): boolean {
  return STATUS_ATIVOS.includes(status)
}

export function classificarOrigemSolicitacao(
  reused: boolean,
  status: JobStatus,
): OrigemSolicitacao {
  if (!reused) return 'NOVA'
  return statusEstaAtivo(status) ? 'EM_ANDAMENTO' : 'RESULTADO_ANTERIOR'
}
