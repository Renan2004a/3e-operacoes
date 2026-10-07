import {
  JobNotFoundError,
  type IntegracaoRepository,
  type IntegrationJobEventRecord,
  type JobStatus,
} from './contratos'

export interface ConsultarStatusResult {
  jobId: string
  status: JobStatus
  /** true quando o job atingiu um estado final (SUCCEEDED ou FAILED). */
  final: boolean
  events: IntegrationJobEventRecord[]
}

const FINAL_STATUSES: readonly JobStatus[] = ['SUCCEEDED', 'FAILED']

export async function consultarStatus(
  jobId: string,
  repo: IntegracaoRepository,
): Promise<ConsultarStatusResult> {
  const job = await repo.findById(jobId)
  if (!job) throw new JobNotFoundError(jobId)

  const events = await repo.listEvents(jobId)
  return { jobId: job.id, status: job.status, final: FINAL_STATUSES.includes(job.status), events }
}
