import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { calcularStatusPrazoEntrega } from './status-prazo-entrega'

const dec = (valor: string | number) => new Prisma.Decimal(valor)

/** Fim do dia 01/02/2026 em America/Sao_Paulo (02:59:59.999Z de 02/02). */
const PRAZO_VENCIDO = new Date('2026-02-02T02:59:59.999Z')
/** 23:00 de 01/02/2026 em America/Sao_Paulo: o dia do prazo ainda vale. */
const DENTRO_DO_DIA = new Date('2026-02-02T02:00:00.000Z')
/** 00:00 de 02/02/2026 em America/Sao_Paulo: o dia do prazo terminou. */
const DEPOIS_DO_DIA = new Date('2026-02-02T03:00:00.000Z')

function calcular(input: {
  prazo: Date | null
  solicitado?: Prisma.Decimal
  entregue?: Prisma.Decimal
  agora?: Date
}) {
  return calcularStatusPrazoEntrega({
    prazo: input.prazo,
    solicitado: input.solicitado ?? dec(10),
    entregue: input.entregue ?? dec(0),
    agora: input.agora ?? DEPOIS_DO_DIA,
  })
}

describe('calcularStatusPrazoEntrega', () => {
  it('retorna SEM_PRAZO quando o item não tem prazo de entrega', () => {
    expect(calcular({ prazo: null })).toBe('SEM_PRAZO')
  })

  it('retorna EM_DIA quando o prazo ainda não terminou, mesmo sem entrega', () => {
    const prazo = new Date('2026-02-10T02:59:59.999Z')
    expect(calcular({ prazo, agora: PRAZO_VENCIDO })).toBe('EM_DIA')
  })

  it('marca atraso quando o item foi produzido, mas nada foi entregue', () => {
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec(10),
        entregue: dec(0),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('ATRASADO')
  })

  it('marca atraso quando todo o executado foi entregue, mas falta atender o solicitado', () => {
    // Solicitado 10, executado 8, entregue 8: RN004 conclui o executado, mas
    // o atendimento integral do solicitado (AD-011) não foi alcançado.
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec(10),
        entregue: dec(8),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('ATRASADO')
  })

  it('marca atraso quando não houve nenhuma execução', () => {
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec(10),
        entregue: dec(0),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('ATRASADO')
  })

  it('não marca atraso quando a entrega alcança o solicitado', () => {
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec(10),
        entregue: dec(10),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('EM_DIA')
  })

  it('não marca atraso quando a entrega supera o solicitado por exceção', () => {
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec(10),
        entregue: dec(12),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('EM_DIA')
  })

  it('mantém o prazo de hoje válido até o fim do dia em America/Sao_Paulo', () => {
    expect(calcular({ prazo: PRAZO_VENCIDO, agora: DENTRO_DO_DIA })).toBe('EM_DIA')
  })

  it('marca atraso a partir do instante posterior ao fim do dia do prazo', () => {
    expect(calcular({ prazo: PRAZO_VENCIDO, agora: DEPOIS_DO_DIA })).toBe('ATRASADO')
  })

  it('compara decimais sem perder precisão', () => {
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec('10.00'),
        entregue: dec('9.99'),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('ATRASADO')
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec('10.00'),
        entregue: dec('10.00'),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('EM_DIA')
  })

  it('não marca atraso quando o solicitado e o entregue são zero', () => {
    expect(
      calcular({
        prazo: PRAZO_VENCIDO,
        solicitado: dec(0),
        entregue: dec(0),
        agora: DEPOIS_DO_DIA,
      }),
    ).toBe('EM_DIA')
  })
})
