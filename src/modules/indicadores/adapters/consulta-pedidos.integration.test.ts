import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { listarPedidos } from '../consulta-pedidos'

/**
 * Testes de integração da consulta de pedidos contra um MySQL real (A1, D8).
 * Só executam quando `RUN_INTEGRATION_TESTS=1` e o banco aponta para uma base
 * de teste/integração. O CI não roda estes testes nesta etapa (D8: workflow
 * inalterado), então ficam explicitamente ignorados fora desse cenário.
 */
const url = process.env.DATABASE_URL
const bancoSeguro = (() => {
  if (!url) return false
  try {
    return /(integration|test)/i.test(new URL(url).pathname)
  } catch {
    return false
  }
})()
const ativo = process.env.RUN_INTEGRATION_TESTS === '1' && bancoSeguro

type StatusAtividade = 'PENDING' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'DIVERGENT'
type Setor = 'TELHAS' | 'CORTE_DOBRA' | 'REVENDA'

interface AtividadeSeed {
  setor: Setor
  status: StatusAtividade
  /** Padrão `CLASSIFIED`; permite semear a inconsistência item com atividade e sem desmembrar. */
  classificacao?: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
}

interface PedidoSeed {
  numero: string
  cliente?: string | null
  criadoEm: Date
  atividades?: AtividadeSeed[]
  itensSemAtividade?: number
}

let prisma: import('@/generated/prisma/client').PrismaClient
let repo: import('../adapters/prisma-indicadores-repository').IndicadoresRepository
const setores = new Map<Setor, string>()

async function garantirSetores() {
  for (const [code, name] of [
    ['CORTE_DOBRA', 'Corte e Dobra'],
    ['TELHAS', 'Telhas'],
    ['REVENDA', 'Revenda'],
  ] as const) {
    const setor = await prisma.sector.upsert({
      where: { code },
      update: {},
      create: { code, name },
    })
    setores.set(code, setor.id)
  }
}

async function criarPedido(seed: PedidoSeed) {
  const order = await prisma.order.create({
    data: {
      id: `a1-${seed.numero}`,
      legacyOrderKey: `a1-key-${seed.numero}`,
      legacyNumber: seed.numero,
      customerName: seed.cliente ?? null,
      createdAt: seed.criadoEm,
    },
  })

  let indice = 0
  for (const atividade of seed.atividades ?? []) {
    const item = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        legacyItemKey: `item-${indice++}`,
        unit: 'UN',
        requestedQuantity: 1,
        // Item com atividade é um item já desmembrado no fluxo real (AD-003).
        classificationStatus: atividade.classificacao ?? 'CLASSIFIED',
      },
    })
    await prisma.activity.create({
      data: {
        orderItemId: item.id,
        sectorId: setores.get(atividade.setor)!,
        status: atividade.status,
      },
    })
  }

  for (let semAtividade = 0; semAtividade < (seed.itensSemAtividade ?? 0); semAtividade += 1) {
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        legacyItemKey: `item-${indice++}`,
        unit: 'UN',
        requestedQuantity: 1,
      },
    })
  }
}

function data(iso: string): Date {
  return new Date(iso)
}

describe.skipIf(!ativo)('consulta de pedidos no MySQL (integração A1)', () => {
  beforeAll(async () => {
    prisma = (await import('@/shared/db/prisma')).prisma
    repo = (await import('../adapters/prisma-indicadores-repository')).prismaIndicadoresRepository
    await garantirSetores()
  })

  beforeEach(async () => {
    await prisma.order.deleteMany({ where: { id: { startsWith: 'a1-' } } })
  })

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { startsWith: 'a1-' } } })
  })

  async function semearPedidos(quantidade: number, inicio = 1) {
    for (let indice = 0; indice < quantidade; indice += 1) {
      await criarPedido({
        numero: String(inicio + indice),
        criadoEm: new Date(Date.UTC(2026, 0, 1, 0, inicio + indice)),
        atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
      })
    }
  }

  it('primeira página: 20 de 25, ordenada por criação decrescente (A1)', async () => {
    await semearPedidos(25)

    const resultado = await listarPedidos({}, repo)

    expect(resultado.pedidos).toHaveLength(20)
    expect(resultado.pedidos[0].numero).toBe('25')
    expect(resultado.pedidos[19].numero).toBe('6')
    expect(resultado.paginacao).toEqual({
      limite: 20,
      offset: 0,
      pagina: 1,
      total: 25,
      totalPaginas: 2,
    })
  })

  it('última página: 5 de 25, sem repetir a primeira (A1)', async () => {
    await semearPedidos(25)

    const primeira = await listarPedidos({}, repo)
    const ultima = await listarPedidos({ offset: 20 }, repo)

    expect(ultima.pedidos.map((linha) => linha.numero)).toEqual(['5', '4', '3', '2', '1'])
    expect(ultima.paginacao).toMatchObject({ pagina: 2, total: 25, totalPaginas: 2 })
    const idsPrimeira = new Set(primeira.pedidos.map((linha) => linha.id))
    expect(ultima.pedidos.every((linha) => !idsPrimeira.has(linha.id))).toBe(true)
  })

  it('página intermediária com limite menor (A1)', async () => {
    await semearPedidos(25)

    const resultado = await listarPedidos({ limite: 10, offset: 10 }, repo)

    expect(resultado.pedidos.map((linha) => linha.numero)).toEqual([
      '15',
      '14',
      '13',
      '12',
      '11',
      '10',
      '9',
      '8',
      '7',
      '6',
    ])
    expect(resultado.paginacao).toMatchObject({ pagina: 2, total: 25, totalPaginas: 3 })
  })

  it('página inexistente: lista vazia e total correto (A1, D2)', async () => {
    await semearPedidos(3)

    const resultado = await listarPedidos({ offset: 100 }, repo)

    expect(resultado.pedidos).toEqual([])
    expect(resultado.paginacao).toMatchObject({ pagina: 6, total: 3, totalPaginas: 1 })
  })

  it('menos de 20, exatamente 20 e mais de 20 resultados (A1)', async () => {
    await semearPedidos(3)
    expect((await listarPedidos({}, repo)).paginacao.totalPaginas).toBe(1)

    await prisma.order.deleteMany({ where: { id: { startsWith: 'a1-' } } })
    await semearPedidos(20)
    expect((await listarPedidos({}, repo)).paginacao.totalPaginas).toBe(1)

    await prisma.order.deleteMany({ where: { id: { startsWith: 'a1-' } } })
    await semearPedidos(21)
    expect((await listarPedidos({}, repo)).paginacao.totalPaginas).toBe(2)
  })

  it('combina número, cliente, setor, status e período antes de paginar (IND-02, A1)', async () => {
    const dentro = data('2026-10-22T12:00:00.000-03:00')
    await criarPedido({
      numero: '70435',
      cliente: 'Construtora X',
      criadoEm: dentro,
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })
    await criarPedido({
      numero: '70436',
      cliente: 'Construtora Y',
      criadoEm: dentro,
      atividades: [{ setor: 'TELHAS', status: 'COMPLETED' }],
    })
    await criarPedido({
      numero: '70437',
      cliente: 'Mercado',
      criadoEm: dentro,
      atividades: [{ setor: 'CORTE_DOBRA', status: 'PENDING' }],
    })
    await criarPedido({
      numero: '704350',
      cliente: 'Construtora X',
      criadoEm: data('2026-10-23T12:00:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })

    const resultado = await listarPedidos(
      {
        numero: '70435',
        cliente: 'construtora',
        setor: 'TELHAS',
        status: 'PENDING',
        de: data('2026-10-22T03:00:00.000Z'),
        ate: data('2026-10-23T03:00:00.000Z'),
      },
      repo,
    )

    expect(resultado.pedidos.map((linha) => linha.numero)).toEqual(['70435'])
    expect(resultado.paginacao.total).toBe(1)
  })

  it('pedido com vários setores aparece uma única vez e mantém o status global (AD-018, A1)', async () => {
    await criarPedido({
      numero: '9001',
      cliente: 'Cliente multi',
      criadoEm: data('2026-10-22T12:00:00.000-03:00'),
      atividades: [
        { setor: 'TELHAS', status: 'PENDING' },
        { setor: 'CORTE_DOBRA', status: 'COMPLETED' },
      ],
    })

    const telhas = await listarPedidos({ setor: 'TELHAS' }, repo)
    const corte = await listarPedidos({ setor: 'CORTE_DOBRA' }, repo)
    const revenda = await listarPedidos({ setor: 'REVENDA' }, repo)

    expect(telhas.pedidos).toHaveLength(1)
    expect(telhas.pedidos[0].status).toBe('IN_PROGRESS')
    expect(telhas.paginacao.total).toBe(1)
    expect(corte.pedidos).toHaveLength(1)
    expect(corte.paginacao.total).toBe(1)
    expect(revenda.pedidos).toEqual([])
    expect(revenda.paginacao.total).toBe(0)
  })

  it('status derivado preserva os critérios atuais, inclusive PAUSED e DIVERGENT (IND-01, D7)', async () => {
    await criarPedido({
      numero: 's1',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      itensSemAtividade: 1,
    })
    await criarPedido({
      numero: 's2',
      criadoEm: data('2026-10-22T10:01:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })
    await criarPedido({
      numero: 's3',
      criadoEm: data('2026-10-22T10:02:00.000-03:00'),
      atividades: [
        { setor: 'TELHAS', status: 'COMPLETED' },
        { setor: 'CORTE_DOBRA', status: 'COMPLETED' },
      ],
    })
    await criarPedido({
      numero: 's4',
      criadoEm: data('2026-10-22T10:03:00.000-03:00'),
      atividades: [
        { setor: 'TELHAS', status: 'COMPLETED' },
        { setor: 'CORTE_DOBRA', status: 'IN_PROGRESS' },
      ],
    })
    await criarPedido({
      numero: 's5',
      criadoEm: data('2026-10-22T10:04:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PAUSED' }],
    })
    await criarPedido({
      numero: 's6',
      criadoEm: data('2026-10-22T10:05:00.000-03:00'),
      atividades: [{ setor: 'REVENDA', status: 'DIVERGENT' }],
    })

    const pendentes = await listarPedidos({ status: 'PENDING' }, repo)
    const concluidos = await listarPedidos({ status: 'COMPLETED' }, repo)
    const andamento = await listarPedidos({ status: 'IN_PROGRESS' }, repo)

    expect(pendentes.pedidos.map((l) => l.numero).sort()).toEqual(['s1', 's2'])
    expect(concluidos.pedidos.map((l) => l.numero)).toEqual(['s3'])
    expect(andamento.pedidos.map((l) => l.numero).sort()).toEqual(['s4', 's5', 's6'])
  })

  it('item ativo sem desmembramento impede produção concluída no cálculo e no filtro (AD-013)', async () => {
    await criarPedido({
      numero: 'nd1',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'COMPLETED' }],
      itensSemAtividade: 1,
    })
    await criarPedido({
      numero: 'nd2',
      criadoEm: data('2026-10-22T10:01:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'COMPLETED' }],
    })
    await criarPedido({
      numero: 'nd3',
      criadoEm: data('2026-10-22T10:02:00.000-03:00'),
      atividades: [
        {
          setor: 'TELHAS',
          status: 'COMPLETED',
          classificacao: 'PENDING_CLASSIFICATION',
        },
      ],
    })
    await criarPedido({
      numero: 'nd4',
      criadoEm: data('2026-10-22T10:03:00.000-03:00'),
    })

    const pendentes = await listarPedidos({ status: 'PENDING' }, repo)
    const concluidos = await listarPedidos({ status: 'COMPLETED' }, repo)
    const andamento = await listarPedidos({ status: 'IN_PROGRESS' }, repo)
    const todos = await listarPedidos({}, repo)

    expect(pendentes.pedidos.map((linha) => linha.numero)).toEqual(['nd4'])
    expect(concluidos.pedidos.map((linha) => linha.numero)).toEqual(['nd2'])
    expect(andamento.pedidos.map((linha) => linha.numero).sort()).toEqual(['nd1', 'nd3'])
    expect(Object.fromEntries(todos.pedidos.map((linha) => [linha.numero, linha.status]))).toEqual({
      nd1: 'IN_PROGRESS',
      nd2: 'COMPLETED',
      nd3: 'IN_PROGRESS',
      nd4: 'PENDING',
    })
  })

  it('filtro de setor não altera o status global ao combinar com status (AD-018)', async () => {
    await criarPedido({
      numero: 'g1',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      atividades: [
        { setor: 'TELHAS', status: 'PENDING' },
        { setor: 'CORTE_DOBRA', status: 'COMPLETED' },
      ],
    })

    const emAndamento = await listarPedidos({ setor: 'TELHAS', status: 'IN_PROGRESS' }, repo)
    const concluido = await listarPedidos({ setor: 'TELHAS', status: 'COMPLETED' }, repo)

    expect(emAndamento.pedidos.map((l) => l.numero)).toEqual(['g1'])
    expect(concluido.pedidos).toEqual([])
  })

  it('pesquisa parcial pelo número comercial (AD-019)', async () => {
    for (const numero of ['100', '1000', '2100', '2001']) {
      await criarPedido({
        numero,
        criadoEm: data('2026-10-22T10:00:00.000-03:00'),
        atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
      })
    }

    const resultado = await listarPedidos({ numero: '100' }, repo)

    expect(resultado.pedidos.map((l) => l.numero).sort()).toEqual(['100', '1000', '2100'])
    expect(resultado.paginacao.total).toBe(3)
  })

  it('número inexistente retorna lista vazia e total zero (AD-019)', async () => {
    await criarPedido({
      numero: '70435',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })

    const resultado = await listarPedidos({ numero: '99999' }, repo)

    expect(resultado.pedidos).toEqual([])
    expect(resultado.paginacao.total).toBe(0)
  })

  it('não usa o id interno do pedido como número comercial (AD-019)', async () => {
    await criarPedido({
      numero: '70435',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })

    const resultado = await listarPedidos({ numero: 'a1-70435' }, repo)

    expect(resultado.pedidos).toEqual([])
    expect(resultado.paginacao.total).toBe(0)
  })

  it('trata % e _ como literais na pesquisa (A1, D4)', async () => {
    for (const numero of ['100%', '100_', '1000']) {
      await criarPedido({
        numero,
        criadoEm: data('2026-10-22T10:00:00.000-03:00'),
        atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
      })
    }

    expect((await listarPedidos({ numero: '100%' }, repo)).pedidos.map((l) => l.numero)).toEqual([
      '100%',
    ])
    expect((await listarPedidos({ numero: '100_' }, repo)).pedidos.map((l) => l.numero)).toEqual([
      '100_',
    ])
  })

  it('pesquisa cliente sem diferenciar acentos pela collation (A1, D3)', async () => {
    await criarPedido({
      numero: 'c1',
      cliente: 'João',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })
    await criarPedido({
      numero: 'c2',
      cliente: 'Joao',
      criadoEm: data('2026-10-22T10:01:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })

    const resultado = await listarPedidos({ cliente: 'joao' }, repo)

    expect(resultado.pedidos.map((l) => l.numero).sort()).toEqual(['c1', 'c2'])
  })

  it('período: início inclusivo e fim exclusivo (AD-014)', async () => {
    for (const [numero, iso] of [
      ['d1', '2026-10-22T02:59:59.999Z'],
      ['d2', '2026-10-22T03:00:00.000Z'],
      ['d3', '2026-10-23T02:59:59.999Z'],
      ['d4', '2026-10-23T03:00:00.000Z'],
    ] as const) {
      await criarPedido({
        numero,
        criadoEm: data(iso),
        atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
      })
    }

    const resultado = await listarPedidos(
      { de: data('2026-10-22T03:00:00.000Z'), ate: data('2026-10-23T03:00:00.000Z') },
      repo,
    )

    expect(resultado.pedidos.map((l) => l.numero).sort()).toEqual(['d2', 'd3'])
  })

  it('datas iguais: desempate por id, sem repetir nem omitir entre páginas (QF-07, A1)', async () => {
    const mesmaData = data('2026-10-22T12:00:00.000-03:00')
    for (const numero of ['a1-A', 'a1-B', 'a1-C']) {
      await criarPedido({
        numero,
        criadoEm: mesmaData,
        atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
      })
    }

    const paginas = [
      await listarPedidos({ limite: 1, offset: 0 }, repo),
      await listarPedidos({ limite: 1, offset: 1 }, repo),
      await listarPedidos({ limite: 1, offset: 2 }, repo),
    ]

    expect(paginas.map((pagina) => pagina.pedidos[0].id)).toEqual(['a1-a1-A', 'a1-a1-B', 'a1-a1-C'])
  })

  it('pedido sem classificação não entra no filtro de setor, mas aparece sem filtro (LAC-04)', async () => {
    await criarPedido({
      numero: 'n1',
      criadoEm: data('2026-10-22T10:00:00.000-03:00'),
      itensSemAtividade: 1,
    })
    await criarPedido({
      numero: 'n2',
      criadoEm: data('2026-10-22T10:01:00.000-03:00'),
      atividades: [{ setor: 'TELHAS', status: 'PENDING' }],
    })

    const comSetor = await listarPedidos({ setor: 'TELHAS' }, repo)
    const semSetor = await listarPedidos({}, repo)

    expect(comSetor.pedidos.map((l) => l.numero)).toEqual(['n2'])
    expect(comSetor.paginacao.total).toBe(1)
    expect(semSetor.pedidos.map((l) => l.numero).sort()).toEqual(['n1', 'n2'])
    expect(semSetor.pedidos.find((l) => l.numero === 'n1')?.status).toBe('PENDING')
  })
})
