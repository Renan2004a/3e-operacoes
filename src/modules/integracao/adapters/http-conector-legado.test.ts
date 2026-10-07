import { describe, expect, it } from 'vitest'
import { createHttpConectorLegado, type FetchLike } from './http-conector-legado'

const BASE = 'https://connector.exemplo.com'
const TOKEN = 'token-conector'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('createHttpConectorLegado', () => {
  it('envia o job com o header de autorização e aceita a resposta do conector', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = []
    const fetchImpl: FetchLike = async (url, init) => {
      calls.push({ url, init })
      return jsonResponse({ accepted: true, jobId: 'job_1' })
    }
    const conector = createHttpConectorLegado({ baseUrl: BASE, token: TOKEN, fetchImpl })

    await conector.despachar({ jobId: 'job_1', orderNumber: '70435' })

    expect(calls).toHaveLength(1)
    expect(calls[0].url).toBe(`${BASE}/jobs/import-order`)
    expect(calls[0].init?.method).toBe('POST')
    expect((calls[0].init?.headers as Record<string, string>).authorization).toBe(`Bearer ${TOKEN}`)
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({ jobId: 'job_1', orderNumber: '70435' })
  })

  it('falha com CONNECTOR_UNAUTHORIZED quando o conector responde 401', async () => {
    const conector = createHttpConectorLegado({
      baseUrl: BASE,
      token: TOKEN,
      fetchImpl: async () => jsonResponse({ error: 'unauthorized' }, 401),
    })

    await expect(conector.despachar({ jobId: 'job_1', orderNumber: '70435' })).rejects.toMatchObject({
      name: 'ConectorLegadoError',
      code: 'CONNECTOR_UNAUTHORIZED',
    })
  })

  it('falha com CONNECTOR_TIMEOUT quando o conector não responde no tempo limite', async () => {
    const fetchImpl: FetchLike = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted')
          error.name = 'AbortError'
          reject(error)
        })
      })
    const conector = createHttpConectorLegado({ baseUrl: BASE, token: TOKEN, timeoutMs: 10, fetchImpl })

    await expect(conector.despachar({ jobId: 'job_1', orderNumber: '70435' })).rejects.toMatchObject({
      code: 'CONNECTOR_TIMEOUT',
    })
  })

  it('falha com CONNECTOR_HTTP_ERROR quando o conector responde 500', async () => {
    const conector = createHttpConectorLegado({
      baseUrl: BASE,
      token: TOKEN,
      fetchImpl: async () => jsonResponse({ error: 'boom' }, 500),
    })

    await expect(conector.despachar({ jobId: 'job_1', orderNumber: '70435' })).rejects.toMatchObject({
      code: 'CONNECTOR_HTTP_ERROR',
    })
  })

  it('falha com CONNECTOR_INVALID_RESPONSE quando o corpo de sucesso é inválido', async () => {
    const conector = createHttpConectorLegado({
      baseUrl: BASE,
      token: TOKEN,
      fetchImpl: async () => jsonResponse({ ok: true }),
    })

    await expect(conector.despachar({ jobId: 'job_1', orderNumber: '70435' })).rejects.toMatchObject({
      code: 'CONNECTOR_INVALID_RESPONSE',
    })
  })
})
