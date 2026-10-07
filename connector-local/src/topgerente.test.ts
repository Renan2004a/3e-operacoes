import { describe, expect, it } from 'vitest'
import { CONSULTAR_PEDIDO_SQL, consultarPedidoTopGerente } from './topgerente.js'

function createQueryable(rows: Record<string, unknown>[]) {
  const calls: Array<{ sql: string; params?: unknown[] }> = []
  const queryable = {
    async query(sql: string, params?: unknown[]) {
      calls.push({ sql, params })
      return [rows, undefined] as [unknown, unknown?]
    },
  }
  return { calls, queryable }
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

describe('consultarPedidoTopGerente', () => {
  it('normaliza o cabeçalho do pedido', async () => {
    const { queryable } = createQueryable([row()])

    const result = await consultarPedidoTopGerente(queryable, '70435')

    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.order).toMatchObject({
      emp: 1,
      orc: 70435,
      legacyOrderKey: '1:70435',
      legacyNumber: '70435',
      customerName: 'MARCO ANTONIO DE OLIVEIRA',
      sellerCode: '10',
      sourceUpdatedAt: '2026-10-01T00:00:00.000Z',
    })
  })

  it('normaliza os itens com quantidade decimal como string', async () => {
    const { queryable } = createQueryable([row({ seq: 3, prod: 'P009', descr_produto: 'PERFIL', qtde: 12.5 })])

    const result = await consultarPedidoTopGerente(queryable, '70435')

    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.order.items).toEqual([
      {
        seq: 3,
        productCode: 'P009',
        description: 'PERFIL',
        unit: 'UN',
        requestedQuantity: '12.500',
        legacyCategory: null,
      },
    ])
  })

  it('exclui itens com cancelado = S', async () => {
    const { queryable } = createQueryable([
      row({ seq: 1, cancelado: '' }),
      row({ seq: 2, cancelado: 'S' }),
      row({ seq: 3, cancelado: 's' }),
    ])

    const result = await consultarPedidoTopGerente(queryable, '70435')

    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.order.items.map((item) => item.seq)).toEqual([1])
  })

  it('retorna not_found quando não há linhas', async () => {
    const { queryable } = createQueryable([])

    const result = await consultarPedidoTopGerente(queryable, '99999')

    expect(result).toEqual({ found: false })
  })

  it('usa unidade como fallback quando unidade_venda está vazia', async () => {
    const { queryable } = createQueryable([row({ unidade_venda: '', unidade: 'M' })])

    const result = await consultarPedidoTopGerente(queryable, '70435')

    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.order.items[0].unit).toBe('M')
  })

  it('deixa sellerCode nulo quando Vend é zero', async () => {
    const { queryable } = createQueryable([row({ vend: 0 })])

    const result = await consultarPedidoTopGerente(queryable, '70435')

    expect(result.found).toBe(true)
    if (!result.found) return
    expect(result.order.sellerCode).toBeNull()
  })

  it('consulta o legado com parâmetros Emp e Orc', async () => {
    const { calls, queryable } = createQueryable([row()])

    await consultarPedidoTopGerente(queryable, '70435', 2)

    expect(calls).toHaveLength(1)
    expect(calls[0].params).toEqual([2, 70435])
    expect(calls[0].sql).toContain(CONSULTAR_PEDIDO_SQL)
    expect(CONSULTAR_PEDIDO_SQL).toContain('WHERE o.Emp = ? AND o.Orc = ?')
  })
})
