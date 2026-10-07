import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, apiGet, apiPatch, apiPost } from './api-client'

function resposta(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: body === undefined ? {} : { 'content-type': 'application/json' },
  })
}

const assign = vi.fn()

beforeEach(() => {
  assign.mockReset()
  ;(globalThis as unknown as { location?: unknown }).location = { assign }
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete (globalThis as unknown as { location?: unknown }).location
})

describe('apiGet', () => {
  it('envia o cookie de sessão e devolve o JSON (FE-14)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, { atividades: [] }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await apiGet<{ atividades: unknown[] }>('/api/producao/atividades')

    expect(data).toEqual({ atividades: [] })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/producao/atividades')
    expect(init.method).toBe('GET')
    expect(init.credentials).toBe('same-origin')
  })

  it('em 401 redireciona ao login e lança ApiError (FE-13)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { error: 'unauthorized' })))

    await expect(apiGet('/api/producao/atividades')).rejects.toMatchObject({
      status: 401,
      code: 'unauthorized',
    })
    expect(assign).toHaveBeenCalledWith('/login')
  })

  it('com redirectOnUnauthorized=false não redireciona em 401 (FE-13)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(401, { error: 'invalid_credentials' })))

    await expect(
      apiGet('/api/auth/sessao', { redirectOnUnauthorized: false }),
    ).rejects.toBeInstanceOf(ApiError)
    expect(assign).not.toHaveBeenCalled()
  })

  it('em erro com corpo devolve o código da API (FE-14)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(resposta(400, { error: 'invalid_quantity' })))

    await expect(apiGet('/api/x')).rejects.toMatchObject({
      status: 400,
      code: 'invalid_quantity',
    })
  })

  it('falha de rede vira ApiError de conexão (FE-14)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')))

    await expect(apiGet('/api/x')).rejects.toMatchObject({
      status: 0,
      code: 'network_error',
    })
  })
})

describe('apiPost / apiPatch', () => {
  it('apiPost envia JSON com content-type e devolve o corpo (FE-14)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(201, { execucao: { id: 'ex_1' } }))
    vi.stubGlobal('fetch', fetchMock)

    const data = await apiPost<{ execucao: { id: string } }>('/api/producao/atividades/a1/execucoes', {
      quantidade: 8,
    })

    expect(data.execucao.id).toBe('ex_1')
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ quantidade: 8 }))
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
  })

  it('apiPatch usa o método PATCH', async () => {
    const fetchMock = vi.fn().mockResolvedValue(resposta(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await apiPatch('/api/usuarios/u1', { name: 'Ana' })

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe('PATCH')
  })
})
