import { Prisma } from '@/generated/prisma/client'

export interface DisponibilidadeInput {
  /** Soma das quantidades conformes/separadas do item (nunca inclui perdas/refugos). */
  executado: Prisma.Decimal
  /** Soma das quantidades já entregues do item. */
  entregue: Prisma.Decimal
}

/**
 * Disponível para entrega = executado conforme − entregue (RN002, EXP-01).
 * Considera apenas o que foi produzido ou separado, ou seja, o `executado`
 * (EXP-02). Item sem produção tem disponível zero (EXP-14) e o disponível
 * nunca é negativo: o excedente entregue não vira disponível (EXP-01).
 */
export function calcularDisponivel({ executado, entregue }: DisponibilidadeInput): Prisma.Decimal {
  const diferenca = executado.minus(entregue)
  return diferenca.lt(0) ? new Prisma.Decimal(0) : diferenca
}
