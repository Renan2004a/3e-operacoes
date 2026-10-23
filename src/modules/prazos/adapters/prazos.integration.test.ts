import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Testes de integração dos prazos contra um MySQL real (AD-009, D2, D8).
 * Só executam quando `RUN_INTEGRATION_TESTS=1` e o banco aponta para uma base
 * de teste/integração, seguindo o padrão de `consulta-pedidos.integration.test.ts`.
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

const PREFIXO = 'ad009-'

let prisma: import('@/generated/prisma/client').PrismaClient
let prazos: import('../adapters/prisma-prazos-repository').PrazosRepository
let indicadores: import('../../indicadores/adapters/prisma-indicadores-repository').IndicadoresRepository
let pedidos: import('../../pedidos/importar-pedido').PedidosRepository
let definirItem: typeof import('../prazo').definirPrazoItem
let definirAtividade: typeof import('../prazo').definirPrazoAtividade
let setorId: string

interface ItemSeed {
  legacyItemKey: string
  comAtividade?: boolean
}

interface PedidoCriado {
  orderId: string
  itemIds: Record<string, string>
  activityIds: Record<string, string>
}

async function criarPedido(numero: string, itens: ItemSeed[]): Promise<PedidoCriado> {
  const order = await prisma.order.create({
    data: {
      id: `${PREFIXO}${numero}`,
      legacyOrderKey: `${PREFIXO}key-${numero}`,
      legacyNumber: numero,
      customerName: 'Cliente de integração',
    },
  })

  const itemIds: Record<string, string> = {}
  const activityIds: Record<string, string> = {}

  for (const item of itens) {
    const row = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        legacyItemKey: item.legacyItemKey,
        productCode: 'PRD-1',
        description: 'Chapa',
        unit: 'UN',
        requestedQuantity: 10,
        classificationStatus: item.comAtividade ? 'CLASSIFIED' : 'PENDING_CLASSIFICATION',
      },
    })
    itemIds[item.legacyItemKey] = row.id

    if (item.comAtividade) {
      const activity = await prisma.activity.create({
        data: { orderItemId: row.id, sectorId: setorId, status: 'PENDING' },
      })
      activityIds[item.legacyItemKey] = activity.id
    }
  }

  return { orderId: order.id, itemIds, activityIds }
}

function iso(valor: Date | null | undefined): string | null {
  return valor ? valor.toISOString() : null
}

describe.skipIf(!ativo)('prazos no MySQL (integração AD-009)', () => {
  beforeAll(async () => {
    prisma = (await import('@/shared/db/prisma')).prisma
    prazos = (await import('../adapters/prisma-prazos-repository')).prismaPrazosRepository
    indicadores = (await import('../../indicadores/adapters/prisma-indicadores-repository'))
      .prismaIndicadoresRepository
    pedidos = (await import('../../pedidos/adapters/prisma-pedidos-repository'))
      .prismaPedidosRepository
    const prazoModule = await import('../prazo')
    definirItem = prazoModule.definirPrazoItem
    definirAtividade = prazoModule.definirPrazoAtividade

    const setor = await prisma.sector.upsert({
      where: { code: 'TELHAS' },
      update: {},
      create: { code: 'TELHAS', name: 'Telhas' },
    })
    setorId = setor.id
  })

  beforeEach(async () => {
    await prisma.order.deleteMany({ where: { id: { startsWith: PREFIXO } } })
  })

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { startsWith: PREFIXO } } })
  })

  it('persiste o prazo de entrega do item e o recupera no detalhe (D2)', async () => {
    const pedido = await criarPedido('1', [{ legacyItemKey: 'item-1' }])

    await definirItem({ itemId: pedido.itemIds['item-1'], prazo: '2026-02-01' }, prazos)

    const row = await prisma.orderItem.findUnique({ where: { id: pedido.itemIds['item-1'] } })
    expect(iso(row?.deadlineAt)).toBe('2026-02-02T02:59:59.999Z')

    const { detalharPedido } = await import('../../indicadores/consulta-pedidos')
    const detalhe = await detalharPedido(pedido.orderId, indicadores)
    expect(iso(detalhe.itens[0].deadlineAt)).toBe('2026-02-02T02:59:59.999Z')
  })

  it('mantém os prazos independentes entre item e atividade (AD-009)', async () => {
    const pedido = await criarPedido('2', [{ legacyItemKey: 'item-1', comAtividade: true }])

    await definirItem({ itemId: pedido.itemIds['item-1'], prazo: '2026-02-01' }, prazos)

    const semPrazoSetor = await prisma.activity.findUnique({
      where: { id: pedido.activityIds['item-1'] },
    })
    expect(semPrazoSetor?.deadlineAt).toBeNull()

    await definirAtividade(
      { atividadeId: pedido.activityIds['item-1'], prazo: '2026-03-10' },
      prazos,
    )

    const item = await prisma.orderItem.findUnique({ where: { id: pedido.itemIds['item-1'] } })
    const atividade = await prisma.activity.findUnique({
      where: { id: pedido.activityIds['item-1'] },
    })
    expect(iso(item?.deadlineAt)).toBe('2026-02-02T02:59:59.999Z')
    expect(iso(atividade?.deadlineAt)).toBe('2026-03-11T02:59:59.999Z')

    const { detalharPedido } = await import('../../indicadores/consulta-pedidos')
    const detalhe = await detalharPedido(pedido.orderId, indicadores)
    expect(iso(detalhe.itens[0].deadlineAt)).toBe('2026-02-02T02:59:59.999Z')
    expect(iso(detalhe.itens[0].activityDeadlineAt)).toBe('2026-03-11T02:59:59.999Z')
  })

  it('preserva os prazos locais na reimportação do pedido (D8)', async () => {
    const pedido = await criarPedido('3', [{ legacyItemKey: 'item-1', comAtividade: true }])

    await definirItem({ itemId: pedido.itemIds['item-1'], prazo: '2026-02-01' }, prazos)
    await definirAtividade(
      { atividadeId: pedido.activityIds['item-1'], prazo: '2026-03-10' },
      prazos,
    )

    await pedidos.upsertOrder({
      legacyOrderKey: `${PREFIXO}key-3`,
      legacyNumber: '3',
      customerName: 'Cliente atualizado',
      sellerLegacyCode: 'V-1',
      sourceUpdatedAt: new Date('2026-10-22T12:00:00.000Z'),
      items: [
        {
          legacyItemKey: 'item-1',
          productCode: 'PRD-1',
          description: 'Chapa atualizada',
          unit: 'UN',
          requestedQuantity: '12',
          legacyCategory: null,
        },
      ],
    })

    const item = await prisma.orderItem.findUnique({ where: { id: pedido.itemIds['item-1'] } })
    const atividade = await prisma.activity.findUnique({
      where: { id: pedido.activityIds['item-1'] },
    })
    expect(iso(item?.deadlineAt)).toBe('2026-02-02T02:59:59.999Z')
    expect(iso(atividade?.deadlineAt)).toBe('2026-03-11T02:59:59.999Z')
  })

  it('mantém prazos diferentes por item no mesmo pedido (AD-009)', async () => {
    const pedido = await criarPedido('4', [
      { legacyItemKey: 'item-1' },
      { legacyItemKey: 'item-2' },
    ])

    await definirItem({ itemId: pedido.itemIds['item-1'], prazo: '2026-02-01' }, prazos)
    await definirItem({ itemId: pedido.itemIds['item-2'], prazo: '2026-04-30' }, prazos)

    const { detalharPedido } = await import('../../indicadores/consulta-pedidos')
    const detalhe = await detalharPedido(pedido.orderId, indicadores)
    const porItem = new Map(detalhe.itens.map((item) => [item.itemId, iso(item.deadlineAt)]))

    expect(porItem.get(pedido.itemIds['item-1'])).toBe('2026-02-02T02:59:59.999Z')
    expect(porItem.get(pedido.itemIds['item-2'])).toBe('2026-05-01T02:59:59.999Z')
  })

  it('devolve prazo nulo quando o item não tem prazo (AD-009)', async () => {
    const pedido = await criarPedido('5', [{ legacyItemKey: 'item-1' }])

    const { detalharPedido } = await import('../../indicadores/consulta-pedidos')
    const detalhe = await detalharPedido(pedido.orderId, indicadores)

    expect(detalhe.itens[0].deadlineAt).toBeNull()
    expect(detalhe.itens[0].activityDeadlineAt).toBeNull()
  })

  it('rejeita data inválida sem gravar (D2)', async () => {
    const pedido = await criarPedido('6', [{ legacyItemKey: 'item-1' }])
    await expect(
      definirItem({ itemId: pedido.itemIds['item-1'], prazo: '2026-02-30' }, prazos),
    ).rejects.toBeTruthy()

    const row = await prisma.orderItem.findUnique({ where: { id: pedido.itemIds['item-1'] } })
    expect(row?.deadlineAt).toBeNull()
  })
})
