import { Prisma } from '@/generated/prisma/client'

/** Quantidade validada conforme a unidade do item (RN003, RN010, RN020, RN022). */
export type Quantidade = Prisma.Decimal

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

function paraDecimal(unidade: string, valor: Prisma.Decimal | string | number): Prisma.Decimal {
  try {
    return new Prisma.Decimal(valor)
  } catch {
    throw new QuantidadeInvalidaError(unidade, String(valor))
  }
}

/**
 * Valida a quantidade conforme a unidade: rejeita zero, negativo, valor não
 * numérico e fração em unidade inteira; metro é padronizado em 2 casas.
 */
export function validarQuantidade(
  unidade: string,
  valor: Prisma.Decimal | string | number,
): Quantidade {
  const quantidade = paraDecimal(unidade, valor)
  if (!quantidade.isFinite() || quantidade.lte(0)) {
    throw new QuantidadeInvalidaError(unidade, String(valor))
  }
  if (!unidadeUsaCasasDecimais(unidade) && !quantidade.isInteger()) {
    throw new QuantidadeInvalidaError(unidade, String(valor))
  }
  return unidadeUsaCasasDecimais(unidade) ? quantidade.toDecimalPlaces(2) : quantidade
}

/** Formata a quantidade para exibição: peça inteira, metro com 2 casas (RN022). */
export function formatarQuantidade(
  unidade: string,
  valor: Prisma.Decimal | string | number,
): string {
  const quantidade = paraDecimal(unidade, valor)
  return unidadeUsaCasasDecimais(unidade) ? quantidade.toFixed(2) : quantidade.toFixed(0)
}
