/** Sugestão de setor a partir do produto (código/descrição) do legado (LAC-04). */

export interface RegraProdutoSetor {
  /** `CONTAINS` (padrão) ou `PREFIX`. */
  matchType: string
  matchValue: string
  sectorId: string
  /** Maior prioridade é avaliada primeiro. */
  priority: number
}

export interface ProdutoParaSugestao {
  productCode: string | null
  description: string | null
}

/**
 * Retorna o `sectorId` sugerido para o item, com base nas regras ativas
 * (avaliadas por prioridade decrescente). Sem correspondência, retorna `null`.
 * As regras são apenas **sugestões**: a decisão final é de quem desmembra.
 */
export function sugerirSetor(
  item: ProdutoParaSugestao,
  regras: readonly RegraProdutoSetor[],
): string | null {
  const codigo = (item.productCode ?? '').toLowerCase().trim()
  const descricao = (item.description ?? '').toLowerCase().trim()

  const ordenadas = [...regras].sort((a, b) => b.priority - a.priority)

  for (const regra of ordenadas) {
    const valor = regra.matchValue.toLowerCase().trim()
    if (valor === '') continue

    const casa =
      regra.matchType === 'PREFIX'
        ? codigo.startsWith(valor) || descricao.startsWith(valor)
        : codigo.includes(valor) || descricao.includes(valor)

    if (casa) return regra.sectorId
  }

  return null
}
