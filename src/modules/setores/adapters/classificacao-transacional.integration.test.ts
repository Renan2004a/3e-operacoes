import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Integração da classificação manual como unidade transacional.
 * Só executa com `RUN_INTEGRATION_TESTS=1` e banco de teste/integration.
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

const PREFIXO = 'v06-'
const CATEGORIA_PREFIXO = 'v06-cat-'

let prisma: import('@/generated/prisma/client').PrismaClient
let classificarItem: typeof import('../classificar-item').classificarItem
let unidade: import('../classificar-item').UnidadeTrabalhoClassificacao
let ItemJaClassificadoError: typeof import('../classificar-item').ItemJaClassificadoError
let setorTelhas: string
let setorCorte: string
let sequencia = 0

async function criarItem(legacyCategory: string | null = null) {
  sequencia += 1
  const order = await prisma.order.create({
    data: {
      id: `${PREFIXO}pedido-${sequencia}`,
      legacyOrderKey: `${PREFIXO}key-${sequencia}`,
      legacyNumber: `${sequencia}`,
      customerName: 'Cliente V06',
    },
  })
  const item = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      legacyItemKey: `item-${sequencia}`,
      unit: 'UN',
      requestedQuantity: 1,
      legacyCategory,
    },
  })
  return item.id
}

describe.skipIf(!ativo)('classificação manual transacional (integração)', () => {
  beforeAll(async () => {
    prisma = (await import('@/shared/db/prisma')).prisma
    classificarItem = (await import('../classificar-item')).classificarItem
    ItemJaClassificadoError = (await import('../classificar-item')).ItemJaClassificadoError
    unidade = (await import('./prisma-unidade-trabalho-classificacao'))
      .prismaUnidadeTrabalhoClassificacao
    await prisma.user.upsert({
      where: { id: 'user-v06' },
      update: {},
      create: { id: 'user-v06', name: 'user-v06', email: 'user-v06@teste.local', passwordHash: 'x' },
    })

    const telhas = await prisma.sector.upsert({
      where: { code: 'TELHAS' },
      update: {},
      create: { code: 'TELHAS', name: 'Telhas' },
    })
    const corte = await prisma.sector.upsert({
      where: { code: 'CORTE_DOBRA' },
      update: {},
      create: { code: 'CORTE_DOBRA', name: 'Corte e Dobra' },
    })
    setorTelhas = telhas.id
    setorCorte = corte.id
  })

  beforeEach(async () => {
    sequencia = 0
    await prisma.order.deleteMany({ where: { id: { startsWith: PREFIXO } } })
    await prisma.classificationRule.deleteMany({
      where: { value: { startsWith: CATEGORIA_PREFIXO } },
    })
    await prisma.auditLog.deleteMany({
      where: { correlationId: { startsWith: CATEGORIA_PREFIXO } },
    })
  })

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { startsWith: PREFIXO } } })
    await prisma.classificationRule.deleteMany({
      where: { value: { startsWith: CATEGORIA_PREFIXO } },
    })
    await prisma.auditLog.deleteMany({
      where: { correlationId: { startsWith: CATEGORIA_PREFIXO } },
    })
  })

  it('classifica o item e cria/reutiliza o mapeamento da categoria', async () => {
    const categoria = `${CATEGORIA_PREFIXO}telha`
    const itemId = await criarItem(categoria)

    const resultado = await classificarItem(
      { itemId, sectorId: setorTelhas, userId: 'user-v06' },
      { unidade },
    )
    expect(resultado.status).toBe('CLASSIFIED')
    expect(resultado.sectorId).toBe(setorTelhas)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.sectorId).toBe(setorTelhas)
    expect(item?.classifiedAt).not.toBeNull()
    expect(item?.classifiedByUserId).toBe('user-v06')

    const regra = await prisma.classificationRule.findFirst({
      where: { matchType: 'CATEGORIA', value: categoria },
    })
    expect(regra?.sectorId).toBe(setorTelhas)

    const auditoria = await prisma.auditLog.findFirst({
      where: {
        action: 'CREATE',
        entityType: 'CategorySectorMapping',
        entityId: regra?.id,
      },
    })
    expect(auditoria).not.toBeNull()
  })

  it('corrigir a classificação do mesmo item é conflito', async () => {
    const itemId = await criarItem()

    await classificarItem({ itemId, sectorId: setorTelhas, userId: 'user-v06' }, { unidade })
    await expect(
      classificarItem({ itemId, sectorId: setorCorte, userId: 'user-v06' }, { unidade }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.sectorId).toBe(setorTelhas)
  })

  it('concorrência manual no mesmo item: apenas uma classificação vence', async () => {
    const itemId = await criarItem()

    const resultados = await Promise.allSettled([
      classificarItem({ itemId, sectorId: setorTelhas, userId: 'user-a' }, { unidade }),
      classificarItem({ itemId, sectorId: setorCorte, userId: 'user-b' }, { unidade }),
    ])

    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect([setorTelhas, setorCorte]).toContain(item?.sectorId)
  })
})
