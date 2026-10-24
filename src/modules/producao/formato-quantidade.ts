// O tipo vem do client e é apagado na compilação; o valor `Decimal` usa o
// runtime browser-safe, sem arrastar o client de banco para a interface.
import type { Prisma } from '@/generated/prisma/client'
import { Prisma as PrismaRuntime } from '@/generated/prisma/browser'
import { QuantidadeInvalidaError, unidadeUsaCasasDecimais } from './unidade-medida'

/**
 * Formata a quantidade para exibição reutilizando a regra de unidade:
 * peça inteira, metro com 2 casas (RN022). Valor inválido não vira zero:
 * lança `QuantidadeInvalidaError` para o chamador decidir o que exibir.
 */
export function formatarQuantidade(
  unidade: string,
  valor: Prisma.Decimal | string | number,
): string {
  let quantidade: Prisma.Decimal
  try {
    quantidade = new PrismaRuntime.Decimal(valor)
  } catch {
    throw new QuantidadeInvalidaError(unidade, String(valor))
  }
  return unidadeUsaCasasDecimais(unidade) ? quantidade.toFixed(2) : quantidade.toFixed(0)
}
