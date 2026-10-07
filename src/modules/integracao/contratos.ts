import { z } from 'zod'

export const JOB_STATUSES = ['PENDING', 'DISPATCHED', 'RUNNING', 'SUCCEEDED', 'FAILED'] as const
export type JobStatus = (typeof JOB_STATUSES)[number]

/** Janela de idempotência por número de pedido, em milissegundos. */
export const IDEMPOTENCY_WINDOW_MS = 60_000

/** Chave de idempotência estável por pedido; o repositório garante unicidade. */
export function buildIdempotencyKey(orderNumber: string): string {
  return `pedido:${orderNumber}`
}

/** Contrato de despacho (app -> conector local). */
export const dispatchSchema = z.object({
  jobId: z.string().min(1),
  orderNumber: z.string().min(1).max(64),
})
export type DispatchPayload = z.infer<typeof dispatchSchema>

const decimalString = z.string().regex(/^\d+(\.\d+)?$/, 'quantidade decimal inválida')

export const callbackOrderSchema = z.object({
  emp: z.number().int(),
  orc: z.number().int(),
  legacyOrderKey: z.string().min(1),
  legacyNumber: z.string().min(1),
  customerName: z.string().nullable(),
  sellerCode: z.string().nullable(),
  sourceUpdatedAt: z.string().nullable(),
})
export type CallbackOrder = z.infer<typeof callbackOrderSchema>

export const callbackItemSchema = z.object({
  seq: z.number().int(),
  productCode: z.string().min(1),
  description: z.string(),
  unit: z.string().min(1),
  requestedQuantity: decimalString,
  legacyCategory: z.string().nullable(),
})
export type CallbackItem = z.infer<typeof callbackItemSchema>

/** Contrato de callback (conector local -> app). */
export const callbackSchema = z.object({
  jobId: z.string().min(1),
  order: callbackOrderSchema,
  items: z.array(callbackItemSchema),
})
export type CallbackPayload = z.infer<typeof callbackSchema>

export interface IntegrationJob {
  id: string
  legacyOrderNumber: string
  idempotencyKey: string
  status: JobStatus
  attemptCount: number
  errorCode: string | null
  errorMessage: string | null
  createdAt: Date
  updatedAt: Date
  completedAt: Date | null
}

export interface IntegrationJobEventRecord {
  id: string
  jobId: string
  type: string
  detail: string | null
  createdAt: Date
}

export interface IntegracaoRepository {
  /** Busca um job pela chave de idempotência criado em ou após `since`. */
  findRecentByIdempotencyKey(idempotencyKey: string, since: Date): Promise<IntegrationJob | null>
  /** Busca um job pelo id. */
  findById(jobId: string): Promise<IntegrationJob | null>
  /**
   * Cria um job. Deve garantir unicidade de `idempotencyKey`: se a chave já
   * existir, retorna o job existente em vez de criar um segundo.
   */
  create(input: { legacyOrderNumber: string; idempotencyKey: string; now: Date }): Promise<IntegrationJob>
  /** Atualiza o status do job. */
  updateStatus(input: {
    jobId: string
    status: JobStatus
    now: Date
    errorCode?: string | null
    errorMessage?: string | null
    completedAt?: Date | null
  }): Promise<IntegrationJob>
  /** Registra um evento do job. */
  appendEvent(input: {
    jobId: string
    type: string
    detail?: string | null
    now: Date
  }): Promise<IntegrationJobEventRecord>
  /** Lista os eventos do job em ordem cronológica. */
  listEvents(jobId: string): Promise<IntegrationJobEventRecord[]>
}

export interface ConectorLegadoPort {
  /** Envia o pedido ao conector local. Erros de transporte/timeout são lançados. */
  despachar(input: { jobId: string; orderNumber: string }): Promise<void>
}

export class InvalidOrderNumberError extends Error {
  constructor(orderNumber: string) {
    super(`Número de pedido inválido: ${orderNumber}`)
    this.name = 'InvalidOrderNumberError'
  }
}

export class JobNotFoundError extends Error {
  constructor(jobId: string) {
    super(`Job não encontrado: ${jobId}`)
    this.name = 'JobNotFoundError'
  }
}

export class JobNotFailedError extends Error {
  constructor(jobId: string) {
    super(`Job não está em FAILED: ${jobId}`)
    this.name = 'JobNotFailedError'
  }
}

export class InvalidCallbackPayloadError extends Error {
  constructor(detail: string) {
    super(`Payload de callback inválido: ${detail}`)
    this.name = 'InvalidCallbackPayloadError'
  }
}
