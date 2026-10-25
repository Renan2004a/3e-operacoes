/**
 * Helpers puros de unidade de medida, sem dependência de banco. Podem ser
 * reutilizados tanto pelo domínio quanto por componentes de interface.
 */

export class QuantidadeInvalidaError extends Error {
  constructor(unidade: string, valor: string) {
    super(`Quantidade inválida para a unidade "${unidade}": ${valor}`)
    this.name = 'QuantidadeInvalidaError'
  }
}

/** Unidades medidas em metro: aceitam decimais e padronizam 2 casas (RN020, RN022). */
const UNIDADES_METRO = new Set(['M', 'MT', 'M2', 'M²', 'METRO', 'METROS'])

/** Peça/unidade é inteira; metro aceita decimais (RN003, RN010, RN020). */
export function unidadeUsaCasasDecimais(unidade: string): boolean {
  return UNIDADES_METRO.has(unidade.trim().toUpperCase())
}

/**
 * Chave de agrupamento da unidade: sem espaços nas bordas e sem diferenciar
 * maiúsculas. Não há conversão entre unidades diferentes (RN01, RN04).
 */
export function chaveUnidade(unidade: string): string {
  return unidade.trim().toUpperCase()
}

/** Unidade para exibição; `null` quando ausente ou vazia, sem inventar padrão (RN05). */
export function rotuloUnidade(unidade: string): string | null {
  const limpa = unidade.trim()
  return limpa === '' ? null : limpa
}

/** Ordena por rótulo; o grupo sem unidade informada fica por último (RN05). */
export function compararUnidades(a: string | null, b: string | null): number {
  if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1
  return a.localeCompare(b)
}
