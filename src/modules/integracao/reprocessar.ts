import { JobNotFailedError, JobNotFoundError, type IntegracaoRepository } from './contratos'

export interface ReprocessarResult {
  jobId: string
}

export async function reprocessar(
  jobId: string,
  repo: IntegracaoRepository,
  now: Date = new Date(),
): Promise<ReprocessarResult> {
  const job = await repo.findById(jobId)
  if (!job) throw new JobNotFoundError(jobId)
  if (job.status !== 'FAILED') throw new JobNotFailedError(jobId)

  const newJob = await repo.create({
    legacyOrderNumber: job.legacyOrderNumber,
    idempotencyKey: `${job.idempotencyKey}:retry:${now.getTime()}`,
    now,
  })

  return { jobId: newJob.id }
}
