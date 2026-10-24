import { Prisma } from '@/generated/prisma/client'
import { QuantidadeInvalidaError, unidadeUsaCasasDecimais } from './unidade-medida'
import { formatarQuantidade } from './formato-quantidade'

export { QuantidadeInvalidaError, unidadeUsaCasasDecimais, formatarQuantidade }

/** Quantidade validada conforme a unidade do item (RN003, RN010, RN020, RN022). */
export type Quantidade = Prisma.Decimal

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
