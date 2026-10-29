/** Consulta e normalização de um pedido do Top Gerente (`orcamento` + `orcamento_itens`). */

export interface LegadoQueryable {
  query(sql: string, params?: unknown[]): Promise<[unknown, unknown?]>
}

export interface NormalizedItem {
  seq: number
  /** Código do produto ou null quando o legado traz "0"/vazio. */
  productCode: string | null
  description: string
  unit: string
  requestedQuantity: string
  legacyCategory: string | null
}

export interface NormalizedOrder {
  emp: number
  orc: number
  legacyOrderKey: string
  legacyNumber: string
  customerName: string | null
  sellerCode: string | null
  sourceUpdatedAt: string | null
  items: NormalizedItem[]
}

export type ConsultarPedidoResult = { found: true; order: NormalizedOrder } | { found: false }

export const CONSULTAR_PEDIDO_SQL = `SELECT o.Emp AS emp, o.Orc AS orc, o.Vend AS vend,
       o.nome_cliente AS nome_cliente, o.Data AS data,
       i.Seq AS seq, i.Prod AS prod, i.descr_produto AS descr_produto,
       i.Qtde AS qtde, i.unidade AS unidade, i.unidade_venda AS unidade_venda,
       i.cancelado AS cancelado
FROM orcamento o
JOIN orcamento_itens i ON o.Emp = i.Emp AND o.Orc = i.Orc
WHERE o.Emp = ? AND o.Orc = ?
ORDER BY i.Seq`

function toNumber(value: unknown): number {
  return typeof value === 'number' ? value : Number(value)
}

/**
 * Corrige texto do legado gravado com dupla codificação (UTF-8 lido como
 * latin1, ex.: "DobradiÃ§a"). O Top Gerente guarda os bytes assim; sem isso o
 * nome do produto chega quebrado à tela. Quando a conversão não resulta em
 * texto válido, mantém o valor original.
 */
export function corrigirTextoLegado(valor: string): string {
  if (!/[ÃÂ]/.test(valor)) return valor
  try {
    const convertido = Buffer.from(valor, 'latin1').toString('utf8')
    return convertido.includes('\uFFFD') ? valor : convertido
  } catch {
    return valor
  }
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const text = corrigirTextoLegado(String(value).trim())
  return text.length > 0 ? text : null
}

/**
 * Descrição exibível do item. O legado às vezes traz apenas "." ou espaços
 * para itens sem cadastro; devolver vazio permite a interface mostrar um
 * rótulo claro em vez de um ponto solto.
 */
function descricaoLegivel(value: unknown): string {
  const texto = toStringOrNull(value)
  if (!texto || texto === '.' || texto === '-' || texto === '--') return ''
  return texto
}

/** Código de produto "0" (ou vazio) significa "não informado" no legado. */
function codigoLegivel(value: unknown): string | null {
  const texto = toStringOrNull(value)
  if (!texto || texto === '0') return null
  return texto
}

/** Decimal como string com três casas, sem depender do arredondamento do driver. */
function toDecimalString(value: unknown): string {
  const numeric = toNumber(value)
  return Number.isFinite(numeric) ? numeric.toFixed(3) : '0.000'
}

function toIsoDateOrNull(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  const date = value instanceof Date ? value : new Date(String(value))
  if (Number.isNaN(date.getTime())) return null
  if (date.getUTCFullYear() < 1900) return null
  return date.toISOString()
}

export async function consultarPedidoTopGerente(
  queryable: LegadoQueryable,
  orderNumber: string,
  emp = 1,
): Promise<ConsultarPedidoResult> {
  const [result] = await queryable.query(CONSULTAR_PEDIDO_SQL, [emp, Number(orderNumber)])
  const rows = Array.isArray(result) ? (result as Record<string, unknown>[]) : []
  if (rows.length === 0) return { found: false }

  const header = rows[0]
  const orderEmp = toNumber(header.emp)
  const orc = toNumber(header.orc)

  const items: NormalizedItem[] = []
  for (const row of rows) {
    if (String(row.cancelado).toUpperCase() === 'S') continue
    items.push({
      seq: toNumber(row.seq),
      productCode: codigoLegivel(row.prod),
      description: descricaoLegivel(row.descr_produto),
      unit: toStringOrNull(row.unidade_venda) ?? toStringOrNull(row.unidade) ?? '',
      requestedQuantity: toDecimalString(row.qtde),
      legacyCategory: null,
    })
  }

  return {
    found: true,
    order: {
      emp: orderEmp,
      orc,
      legacyOrderKey: `${orderEmp}:${orc}`,
      legacyNumber: String(orc),
      customerName: toStringOrNull(header.nome_cliente),
      sellerCode: toNumber(header.vend) > 0 ? String(toNumber(header.vend)) : null,
      sourceUpdatedAt: toIsoDateOrNull(header.data),
      items,
    },
  }
}
