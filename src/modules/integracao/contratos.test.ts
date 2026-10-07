import { describe, expect, it } from 'vitest'
import { callbackSchema, dispatchSchema } from './contratos'

function validCallback() {
  return {
    jobId: 'job_1',
    order: {
      emp: 1,
      orc: 70435,
      legacyOrderKey: '1:70435',
      legacyNumber: '70435',
      customerName: 'MARCO ANTONIO DE OLIVEIRA',
      sellerCode: '10',
      sourceUpdatedAt: '2026-10-01T12:00:00.000Z',
    },
    items: [
      {
        seq: 1,
        productCode: 'P001',
        description: 'TELHA',
        unit: 'UN',
        requestedQuantity: '5.000',
        legacyCategory: null,
      },
    ],
  }
}

describe('dispatchSchema', () => {
  it('aceita um payload de despacho válido', () => {
    const parsed = dispatchSchema.safeParse({ jobId: 'job_1', orderNumber: '70435' })
    expect(parsed.success).toBe(true)
  })

  it('rejeita despacho sem orderNumber', () => {
    const parsed = dispatchSchema.safeParse({ jobId: 'job_1' })
    expect(parsed.success).toBe(false)
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('orderNumber')
  })

  it('rejeita despacho com jobId vazio', () => {
    const parsed = dispatchSchema.safeParse({ jobId: '', orderNumber: '70435' })
    expect(parsed.success).toBe(false)
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('jobId')
  })
})

describe('callbackSchema', () => {
  it('aceita um payload de callback válido', () => {
    const parsed = callbackSchema.safeParse(validCallback())
    expect(parsed.success).toBe(true)
  })

  it('rejeita callback sem order', () => {
    const { jobId, items } = validCallback()
    const parsed = callbackSchema.safeParse({ jobId, items })
    expect(parsed.success).toBe(false)
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('order')
  })

  it('rejeita item sem unidade', () => {
    const itemWithoutUnit = {
      seq: 1,
      productCode: 'P001',
      description: 'TELHA',
      requestedQuantity: '5.000',
      legacyCategory: null,
    }
    const parsed = callbackSchema.safeParse({ ...validCallback(), items: [itemWithoutUnit] })
    expect(parsed.success).toBe(false)
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('items.0.unit')
  })

  it('rejeita order.emp não inteiro', () => {
    const payload = validCallback()
    payload.order.emp = 1.5
    const parsed = callbackSchema.safeParse(payload)
    expect(parsed.success).toBe(false)
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('order.emp')
  })

  it('rejeita requestedQuantity que não é decimal', () => {
    const payload = validCallback()
    payload.items[0].requestedQuantity = 'abc'
    const parsed = callbackSchema.safeParse(payload)
    expect(parsed.success).toBe(false)
    const paths = parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join('.'))
    expect(paths).toContain('items.0.requestedQuantity')
  })
})
