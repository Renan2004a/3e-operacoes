import { describe, expect, it } from 'vitest'
import { escaparCuringasLike, montarWherePedidos } from './filtros-pedidos-prisma'

describe('escaparCuringasLike', () => {
  it('trata % e _ como texto literal (A1, D4)', () => {
    expect(escaparCuringasLike('100%')).toBe('100\\%')
    expect(escaparCuringasLike('100_')).toBe('100\\_')
    expect(escaparCuringasLike('a%b_c')).toBe('a\\%b\\_c')
  })

  it('escapa a própria barra invertida', () => {
    expect(escaparCuringasLike('a\\b')).toBe('a\\\\b')
  })

  it('mantém o texto sem curingas inalterado', () => {
    expect(escaparCuringasLike('70435')).toBe('70435')
  })
})

describe('montarWherePedidos', () => {
  it('sem filtros, devolve where vazio', () => {
    expect(montarWherePedidos({})).toEqual({})
  })

  it('pesquisa o número comercial como trecho, com curingas escapados (AD-019, D4)', () => {
    expect(montarWherePedidos({ numero: ' 100% ' })).toEqual({
      legacyNumber: { contains: '100\\%' },
    })
  })

  it('pesquisa o cliente como trecho, com curingas escapados', () => {
    expect(montarWherePedidos({ cliente: ' Construtora_X ' })).toEqual({
      customerName: { contains: 'Construtora\\_X' },
    })
  })

  it('filtra pelo código do setor em qualquer atividade do pedido (AD-018)', () => {
    expect(montarWherePedidos({ setor: 'TELHAS' })).toEqual({
      items: { some: { activities: { some: { sector: { code: 'TELHAS' } } } } },
    })
  })

  it('aplica o período com início inclusivo e fim exclusivo (AD-014)', () => {
    const de = new Date('2026-10-22T03:00:00.000Z')
    const ate = new Date('2026-10-23T03:00:00.000Z')

    expect(montarWherePedidos({ de, ate })).toEqual({ createdAt: { gte: de, lt: ate } })
    expect(montarWherePedidos({ de })).toEqual({ createdAt: { gte: de } })
    expect(montarWherePedidos({ ate })).toEqual({ createdAt: { lt: ate } })
  })

  it('traduz PENDING para todos os itens sem atividade ou com atividades pendentes (AD-013)', () => {
    expect(montarWherePedidos({ status: 'PENDING' })).toEqual({
      items: { every: { activities: { every: { status: 'PENDING' } } } },
    })
  })

  it('traduz COMPLETED exigindo item, item desmembrado e todas as atividades concluídas (AD-013)', () => {
    expect(montarWherePedidos({ status: 'COMPLETED' })).toEqual({
      items: {
        some: {},
        every: {
          classificationStatus: 'CLASSIFIED',
          activities: { some: {}, every: { status: 'COMPLETED' } },
        },
      },
    })
  })

  it('traduz IN_PROGRESS como o que não é pendente nem concluído (AD-013)', () => {
    const todosNaoIniciados = {
      items: { every: { activities: { every: { status: 'PENDING' } } } },
    }
    const todosConcluidos = {
      items: {
        some: {},
        every: {
          classificationStatus: 'CLASSIFIED',
          activities: { some: {}, every: { status: 'COMPLETED' } },
        },
      },
    }
    expect(montarWherePedidos({ status: 'IN_PROGRESS' })).toEqual({
      AND: [{ NOT: todosNaoIniciados }, { NOT: todosConcluidos }],
    })
  })

  it('combina filtros e status sem perder critérios (IND-02)', () => {
    expect(montarWherePedidos({ setor: 'TELHAS', status: 'PENDING' })).toEqual({
      AND: [
        { items: { some: { activities: { some: { sector: { code: 'TELHAS' } } } } } },
        { items: { every: { activities: { every: { status: 'PENDING' } } } } },
      ],
    })
  })
})
