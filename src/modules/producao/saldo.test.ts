import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { formatarQuantidade } from './unidades'
import { calcularSaldo } from './saldo'

describe('calcularSaldo', () => {
  it('calcula pendente como solicitado menos executado', () => {
    const saldo = calcularSaldo({
      solicitado: new Prisma.Decimal(10),
      executado: new Prisma.Decimal(8),
    })

    expect(saldo.pendente.toString()).toBe('2')
  })

  it('retorna pendente zero quando o executado iguala o solicitado', () => {
    const saldo = calcularSaldo({
      solicitado: new Prisma.Decimal(10),
      executado: new Prisma.Decimal(10),
    })

    expect(saldo.pendente.toString()).toBe('0')
  })

  it('retorna pendente zero quando o executado ultrapassa o solicitado', () => {
    const saldo = calcularSaldo({
      solicitado: new Prisma.Decimal(10),
      executado: new Prisma.Decimal(12),
    })

    expect(saldo.pendente.toString()).toBe('0')
  })

  it('retorna solicitado, executado e pendente', () => {
    const saldo = calcularSaldo({
      solicitado: new Prisma.Decimal(10),
      executado: new Prisma.Decimal(4),
    })

    expect(saldo.solicitado.toString()).toBe('10')
    expect(saldo.executado.toString()).toBe('4')
    expect(saldo.pendente.toString()).toBe('6')
  })

  it('formata o pendente de metro com duas casas decimais', () => {
    const saldo = calcularSaldo({
      solicitado: new Prisma.Decimal('10'),
      executado: new Prisma.Decimal('8'),
    })

    expect(formatarQuantidade('M', saldo.pendente)).toBe('2.00')
  })

  it('formata o pendente de peça como inteiro', () => {
    const saldo = calcularSaldo({
      solicitado: new Prisma.Decimal('10'),
      executado: new Prisma.Decimal('8'),
    })

    expect(formatarQuantidade('UN', saldo.pendente)).toBe('2')
  })
})
