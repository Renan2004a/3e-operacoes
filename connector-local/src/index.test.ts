import { describe, expect, it } from 'vitest'
import { handleImportOrder, type FetchLike, type ImportOrderDeps } from './index.js'

function createQueryable(rows: Record<string, unknown>[]) {
  return {
    async query() {
      return [rows, undefined] as [unknown, unknown?]
    },
  }
}

function row(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    emp: 1,
    orc: 70435,
    vend: 10,
    nome_cliente: 'MARCO ANTONIO DE OLIVEIRA',
    data: '2026-10-01',
    seq: 1,
    prod: 'P001',
    descr_produto: 'TELHA',
    qtde: 5,
    unidade: 'UN',
    unidade_venda: 'UN',
    cancelado: '',
    ...overrides,
  }
}

function createDeps(overrides: Partial<ImportOrderDeps> = {}) {
  const callbackCalls: Array<{ url: string; init?: RequestInit }> = []
  const fetchImpl: FetchLike = async (url, init) => {
    callbackCalls.push({ url, init })
    return new Response(JSON.stringify({ ok: true }), { status: 200 })
  }

  const deps: ImportOrderDeps = {
    queryable: createQueryable([row()]),
    sharedToken: 'conector-token',
    callbackUrl: 'https://app.exemplo.com/api/integracao/callback',
    callbackToken: 'callback-token',
    empresa: 1,
    fetchImpl,
    ...overrides,
  }

  return { callbackCalls, deps }
}

const REQUEST = { authorization: 'Bearer conector-token', body: { jobId: 'job_1', orderNumber: '70435' } }

describe('handleImportOrder', () => {
  it('responde 401 quando o token é inválido', async () => {
    const { callbackCalls, deps } = createDeps()

    const result = await handleImportOrder({ ...REQUEST, authorization: 'Bearer outro' }, deps)

    expect(result.status).toBe(401)
    expect(callbackCalls).toHaveLength(0)
  })

  it('responde 400 quando o corpo é inválido', async () => {
    const { callbackCalls, deps } = createDeps()

    const result = await handleImportOrder({ authorization: 'Bearer conector-token', body: {} }, deps)

    expect(result.status).toBe(400)
    expect(callbackCalls).toHaveLength(0)
  })

  it('responde 202 e dispara o callback com o payload normalizado', async () => {
    const { callbackCalls, deps } = createDeps()

    const result = await handleImportOrder(REQUEST, deps)

    expect(result).toEqual({ status: 202, body: { accepted: true, jobId: 'job_1' } })
    expect(callbackCalls).toHaveLength(1)
    const payload = JSON.parse(String(callbackCalls[0].init?.body))
    expect(payload.jobId).toBe('job_1')
    expect(payload.order.legacyOrderKey).toBe('1:70435')
    expect(payload.order).not.toHaveProperty('items')
    expect(payload.items).toEqual([
      {
        seq: 1,
        productCode: 'P001',
        description: 'TELHA',
        unit: 'UN',
        requestedQuantity: '5.000',
        legacyCategory: null,
      },
    ])
  })

  it('responde 404 sem callback quando o pedido não existe', async () => {
    const { callbackCalls, deps } = createDeps({ queryable: createQueryable([]) })

    const result = await handleImportOrder(REQUEST, deps)

    expect(result.status).toBe(404)
    expect(callbackCalls).toHaveLength(0)
  })

  it('chama o callback autenticado na URL configurada', async () => {
    const { callbackCalls, deps } = createDeps()

    await handleImportOrder(REQUEST, deps)

    expect(callbackCalls[0].url).toBe('https://app.exemplo.com/api/integracao/callback')
    expect(callbackCalls[0].init?.method).toBe('POST')
    expect((callbackCalls[0].init?.headers as Record<string, string>).authorization).toBe(
      'Bearer callback-token',
    )
  })

  it('responde 502 quando o callback falha', async () => {
    const fetchImpl: FetchLike = async () => new Response('erro', { status: 500 })
    const { deps } = createDeps({ fetchImpl })

    const result = await handleImportOrder(REQUEST, deps)

    expect(result.status).toBe(502)
  })
})
