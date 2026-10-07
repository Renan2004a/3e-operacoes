import { z } from 'zod'
import type { ConectorLegadoPort } from '../contratos'

export const DEFAULT_CONNECTOR_TIMEOUT_MS = 5_000

export class ConectorLegadoError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ConectorLegadoError'
    this.code = code
  }
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface HttpConectorLegadoConfig {
  baseUrl: string
  token: string
  timeoutMs?: number
  fetchImpl?: FetchLike
}

const dispatchResponseSchema = z.object({
  accepted: z.literal(true),
  jobId: z.string().min(1),
})

/** Adapter HTTP que despacha o job ao conector local com token e tempo limite. */
export function createHttpConectorLegado(config: HttpConectorLegadoConfig): ConectorLegadoPort {
  const { baseUrl, token, timeoutMs = DEFAULT_CONNECTOR_TIMEOUT_MS, fetchImpl = fetch } = config
  const url = `${baseUrl.replace(/\/+$/, '')}/jobs/import-order`

  return {
    async despachar({ jobId, orderNumber }) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const response = await fetchImpl(url, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ jobId, orderNumber }),
          signal: controller.signal,
        })

        if (!response.ok) {
          if (response.status === 401) {
            throw new ConectorLegadoError('CONNECTOR_UNAUTHORIZED', 'Conector recusou o token')
          }
          if (response.status === 404) {
            throw new ConectorLegadoError('ORDER_NOT_FOUND', 'Pedido não encontrado no Top Gerente')
          }
          throw new ConectorLegadoError('CONNECTOR_HTTP_ERROR', `Conector respondeu ${response.status}`)
        }

        const body = await response.json().catch(() => null)
        if (!dispatchResponseSchema.safeParse(body).success) {
          throw new ConectorLegadoError('CONNECTOR_INVALID_RESPONSE', 'Resposta inválida do conector')
        }
      } catch (error) {
        if (error instanceof ConectorLegadoError) throw error
        if (error instanceof Error && error.name === 'AbortError') {
          throw new ConectorLegadoError('CONNECTOR_TIMEOUT', 'Conector não respondeu no tempo limite')
        }
        throw new ConectorLegadoError(
          'CONNECTOR_UNAVAILABLE',
          error instanceof Error ? error.message : String(error),
        )
      } finally {
        clearTimeout(timer)
      }
    },
  }
}
