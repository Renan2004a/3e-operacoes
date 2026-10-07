import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { calcularDisponivel } from './disponibilidade'

describe('calcularDisponivel', () => {
  it('calcula o disponível como executado menos entregue (EXP-01)', () => {
    const disponivel = calcularDisponivel({
      executado: new Prisma.Decimal(8),
      entregue: new Prisma.Decimal(3),
    })

    expect(disponivel.toString()).toBe('5')
  })

  it('considera apenas o executado conforme, não o solicitado (EXP-02)', () => {
    const disponivel = calcularDisponivel({
      executado: new Prisma.Decimal(8),
      entregue: new Prisma.Decimal(0),
    })

    expect(disponivel.toString()).toBe('8')
  })

  it('retorna disponível zero quando o item não tem produção (EXP-14)', () => {
    const disponivel = calcularDisponivel({
      executado: new Prisma.Decimal(0),
      entregue: new Prisma.Decimal(0),
    })

    expect(disponivel.toString()).toBe('0')
  })

  it('nunca retorna disponível negativo (EXP-01)', () => {
    const disponivel = calcularDisponivel({
      executado: new Prisma.Decimal(5),
      entregue: new Prisma.Decimal(8),
    })

    expect(disponivel.toString()).toBe('0')
  })

  it('retorna o executado quando nada foi entregue (EXP-01)', () => {
    const disponivel = calcularDisponivel({
      executado: new Prisma.Decimal('10.5'),
      entregue: new Prisma.Decimal(0),
    })

    expect(disponivel.toString()).toBe('10.5')
  })
})
