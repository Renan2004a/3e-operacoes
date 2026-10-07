import { Prisma } from '@/generated/prisma/client'

export interface SaldoInput {
  solicitado: Prisma.Decimal
  executado: Prisma.Decimal
}

export interface Saldo {
  solicitado: Prisma.Decimal
  executado: Prisma.Decimal
  pendente: Prisma.Decimal
}

/**
 * Saldo pendente = solicitado − executado (RN001, PROD-08). Quando o executado
 * ultrapassa o solicitado, o pendente é zero em vez de negativo (RN001).
 */
export function calcularSaldo({ solicitado, executado }: SaldoInput): Saldo {
  const diferenca = solicitado.minus(executado)
  const pendente = diferenca.lt(0) ? new Prisma.Decimal(0) : diferenca
  return { solicitado, executado, pendente }
}
