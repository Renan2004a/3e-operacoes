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
        ...(item.comAtividade
          ? { sectorId: setorId, classifiedAt: new Date(), status: 'PENDING' as const }
          : {}),
      },
    })
    itemIds[item.legacyItemKey] = row.id
    if (item.comAtividade) activityIds[item.legacyItemKey] = row.id
  }

  return { orderId: order.id, itemIds, activityIds }
}

function iso(valor: Date | null | undefined): string | null {
  return valor ? valor.toISOString() : null
}

function deadlineDoJson(valor: unknown): string | null {
  if (typeof valor !== 'object' || valor === null || !('deadlineAt' in valor)) return null
  const deadline = (valor as { deadlineAt?: unknown }).deadlineAt
  return typeof deadline === 'string' ? deadline : null
}

function auditar(entityType: 'OrderItem' | 'Activity', entityId: string) {
  return prisma.auditLog.findMany({
    where: { action: 'DEADLINE_CHANGED', entityType, entityId },
  })
}

/**
 * `logs_auditoria.userId` é VARCHAR(191). Um valor acima do limite faz a
 * gravação da auditoria falhar no MySQL real, permitindo provar o rollback da
 * transação sem inserir mecanismo de falha no código de produção.
 */
const USER_ID_AUDITORIA_INVALIDO = 'u'.repeat(200)

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

    for (const id of ['user-v08', 'user-a', 'user-b']) {
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: { id, name: id, email: `${id}@teste.local`, passwordHash: 'x' },
      })
    }

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

    const semPrazoSetor = await prisma.orderItem.findUnique({
      where: { id: pedido.activityIds['item-1'] },
    })
    expect(semPrazoSetor?.operationalDeadlineAt).toBeNull()

    await definirAtividade(
      { atividadeId: pedido.activityIds['item-1'], prazo: '2026-03-10' },
      prazos,
    )

    const item = await prisma.orderItem.findUnique({ where: { id: pedido.itemIds['item-1'] } })
    const atividade = await prisma.orderItem.findUnique({
      where: { id: pedido.activityIds['item-1'] },
    })
    expect(iso(item?.deadlineAt)).toBe('2026-02-02T02:59:59.999Z')
    expect(iso(atividade?.operationalDeadlineAt)).toBe('2026-03-11T02:59:59.999Z')

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
    const atividade = await prisma.orderItem.findUnique({
      where: { id: pedido.activityIds['item-1'] },
    })
    expect(iso(item?.deadlineAt)).toBe('2026-02-02T02:59:59.999Z')
    expect(iso(atividade?.operationalDeadlineAt)).toBe('2026-03-11T02:59:59.999Z')
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
    expect(await auditar('OrderItem', pedido.itemIds['item-1'])).toHaveLength(0)
  })

  it('grava valor anterior, novo valor e autoria no prazo do item (V08)', async () => {
    const pedido = await criarPedido('v08-item-audit', [{ legacyItemKey: 'item-1' }])

    await definirItem(
      { itemId: pedido.itemIds['item-1'], prazo: '2026-02-01', userId: 'user-v08' },
      prazos,
    )

    const auditorias = await auditar('OrderItem', pedido.itemIds['item-1'])
    expect(auditorias).toHaveLength(1)
    expect(deadlineDoJson(auditorias[0].beforeJson)).toBeNull()
    expect(deadlineDoJson(auditorias[0].afterJson)).toBe('2026-02-02T02:59:59.999Z')
    expect(auditorias[0].userId).toBe('user-v08')
  })

  it('grava valor anterior, novo valor e autoria no prazo da atividade (V08)', async () => {
    const pedido = await criarPedido('v08-ativ-audit', [
      { legacyItemKey: 'item-1', comAtividade: true },
    ])

    await definirAtividade(
      { atividadeId: pedido.activityIds['item-1'], prazo: '2026-03-10', userId: 'user-v08' },
      prazos,
    )

    const auditorias = await auditar('Activity', pedido.activityIds['item-1'])
    expect(auditorias).toHaveLength(1)
    expect(deadlineDoJson(auditorias[0].beforeJson)).toBeNull()
    expect(deadlineDoJson(auditorias[0].afterJson)).toBe('2026-03-11T02:59:59.999Z')
    expect(auditorias[0].userId).toBe('user-v08')
  })

  it('serializa duas alterações simultâneas do mesmo item e mantém a cadeia de auditoria (V08)', async () => {
    const pedido = await criarPedido('v08-item-concorrente', [{ legacyItemKey: 'item-1' }])
    const itemId = pedido.itemIds['item-1']

    const resultados = await Promise.allSettled([
      definirItem({ itemId, prazo: '2026-03-10', userId: 'user-a' }, prazos),
      definirItem({ itemId, prazo: '2026-04-10', userId: 'user-b' }, prazos),
    ])
    expect(resultados.every((resultado) => resultado.status === 'fulfilled')).toBe(true)

    const auditorias = await auditar('OrderItem', itemId)
    expect(auditorias).toHaveLength(2)
    const primeira = auditorias.find((auditoria) => deadlineDoJson(auditoria.beforeJson) === null)
    const segunda = auditorias.find((auditoria) => auditoria !== primeira)
    expect(primeira).toBeDefined()
    expect(segunda).toBeDefined()
    expect(deadlineDoJson(segunda!.beforeJson)).toBe(deadlineDoJson(primeira!.afterJson))

    const row = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(iso(row?.deadlineAt)).toBe(deadlineDoJson(segunda!.afterJson))
  })

  it('serializa duas alterações simultâneas da mesma atividade e mantém a cadeia de auditoria (V08)', async () => {
    const pedido = await criarPedido('v08-ativ-concorrente', [
      { legacyItemKey: 'item-1', comAtividade: true },
    ])
    const atividadeId = pedido.activityIds['item-1']

    const resultados = await Promise.allSettled([
      definirAtividade({ atividadeId, prazo: '2026-05-10', userId: 'user-a' }, prazos),
      definirAtividade({ atividadeId, prazo: '2026-06-10', userId: 'user-b' }, prazos),
    ])
    expect(resultados.every((resultado) => resultado.status === 'fulfilled')).toBe(true)

    const auditorias = await auditar('Activity', atividadeId)
    expect(auditorias).toHaveLength(2)
    const primeira = auditorias.find((auditoria) => deadlineDoJson(auditoria.beforeJson) === null)
    const segunda = auditorias.find((auditoria) => auditoria !== primeira)
    expect(primeira).toBeDefined()
    expect(segunda).toBeDefined()
    expect(deadlineDoJson(segunda!.beforeJson)).toBe(deadlineDoJson(primeira!.afterJson))

    const row = await prisma.orderItem.findUnique({ where: { id: atividadeId } })
    expect(iso(row?.operationalDeadlineAt)).toBe(deadlineDoJson(segunda!.afterJson))
  })

  it('reverte o prazo do item quando a auditoria falha (V08)', async () => {
    const pedido = await criarPedido('v08-item-audit-falha', [{ legacyItemKey: 'item-1' }])
    const itemId = pedido.itemIds['item-1']
    await definirItem({ itemId, prazo: '2026-01-10', userId: 'user-v08' }, prazos)
    const auditoriasAntes = await auditar('OrderItem', itemId)
    expect(auditoriasAntes).toHaveLength(1)

    await expect(
      definirItem(
        { itemId, prazo: '2026-07-10', userId: USER_ID_AUDITORIA_INVALIDO },
        prazos,
      ),
    ).rejects.toBeTruthy()

    const row = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(iso(row?.deadlineAt)).toBe('2026-01-11T02:59:59.999Z')
    expect(await auditar('OrderItem', itemId)).toHaveLength(1)
  })

  it('reverte o prazo da atividade quando a auditoria falha (V08)', async () => {
    const pedido = await criarPedido('v08-ativ-audit-falha', [
      { legacyItemKey: 'item-1', comAtividade: true },
    ])
    const atividadeId = pedido.activityIds['item-1']
    await definirAtividade(
      { atividadeId, prazo: '2026-01-10', userId: 'user-v08' },
      prazos,
    )
    const auditoriasAntes = await auditar('Activity', atividadeId)
    expect(auditoriasAntes).toHaveLength(1)

    await expect(
      definirAtividade(
        { atividadeId, prazo: '2026-08-10', userId: USER_ID_AUDITORIA_INVALIDO },
        prazos,
      ),
    ).rejects.toBeTruthy()

    const row = await prisma.orderItem.findUnique({ where: { id: atividadeId } })
    expect(iso(row?.operationalDeadlineAt)).toBe('2026-01-11T02:59:59.999Z')
    expect(await auditar('Activity', atividadeId)).toHaveLength(1)
  })

  it('não grava auditoria para item ou atividade inexistente (V08)', async () => {
    await expect(
      prazos.definirPrazoItem({
        itemId: 'item-inexistente-v08',
        prazo: new Date('2026-09-10T02:59:59.999Z'),
        userId: 'user-v08',
      }),
    ).resolves.toBeNull()
    await expect(
      prazos.definirPrazoAtividade({
        atividadeId: 'atividade-inexistente-v08',
        prazo: new Date('2026-09-10T02:59:59.999Z'),
        userId: 'user-v08',
      }),
    ).resolves.toBeNull()

    expect(await auditar('OrderItem', 'item-inexistente-v08')).toHaveLength(0)
    expect(await auditar('Activity', 'atividade-inexistente-v08')).toHaveLength(0)
  })
})
