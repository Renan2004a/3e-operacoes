import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Testes de integração da classificação atômica contra MySQL real (V02).
 * Só executam com `RUN_INTEGRATION_TESTS=1` e um banco cujo nome contenha
 * `integration` ou `test`, seguindo o padrão dos demais testes de integração.
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

const PREFIXO = 'v02-'
const CATEGORIA_PREFIXO = 'v02-cat-'

let prisma: import('@/generated/prisma/client').PrismaClient
let classificacao: import('../classificar-item').ClassificacaoRepository
let mapeamento: import('../mapeamento').MapeamentoRepository
let unidade: import('../classificar-item').UnidadeTrabalhoClassificacao
let classificarItem: typeof import('../classificar-item').classificarItem
let classificarPorMapeamento: typeof import('../classificar-item').classificarPorMapeamento
let ItemJaClassificadoError: typeof import('../classificar-item').ItemJaClassificadoError
let ItemNaoEncontradoError: typeof import('../classificar-item').ItemNaoEncontradoError

let setorTelhas: string
let setorCorte: string
let sequencia = 0

async function criarItem(overrides: {
  classificationStatus?: 'PENDING_CLASSIFICATION' | 'CLASSIFIED'
  legacyCategory?: string | null
} = {}) {
  sequencia += 1
  const order = await prisma.order.create({
    data: {
      id: `${PREFIXO}pedido-${sequencia}`,
      legacyOrderKey: `${PREFIXO}key-${sequencia}`,
      legacyNumber: `${sequencia}`,
      customerName: 'Cliente V02',
    },
  })
  const item = await prisma.orderItem.create({
    data: {
      orderId: order.id,
      legacyItemKey: `item-${sequencia}`,
      unit: 'UN',
      requestedQuantity: 1,
      legacyCategory: overrides.legacyCategory ?? null,
      classificationStatus: overrides.classificationStatus ?? 'PENDING_CLASSIFICATION',
    },
  })
  return { orderId: order.id, itemId: item.id }
}

function vencedores<T>(resultados: PromiseSettledResult<T>[]): PromiseFulfilledResult<T>[] {
  return resultados.filter(
    (resultado): resultado is PromiseFulfilledResult<T> => resultado.status === 'fulfilled',
  )
}

function perdedores<T>(resultados: PromiseSettledResult<T>[]): PromiseRejectedResult[] {
  return resultados.filter(
    (resultado): resultado is PromiseRejectedResult => resultado.status === 'rejected',
  )
}

describe.skipIf(!ativo)('classificação atômica no MySQL (integração V02)', () => {
  beforeAll(async () => {
    prisma = (await import('@/shared/db/prisma')).prisma
    classificacao = (await import('./prisma-classificacao-repository'))
      .prismaClassificacaoRepository
    mapeamento = (await import('./prisma-setores-repository')).prismaMapeamentoRepository
    unidade = (await import('./prisma-unidade-trabalho-classificacao'))
      .prismaUnidadeTrabalhoClassificacao
    const modulo = await import('../classificar-item')
    classificarItem = modulo.classificarItem
    classificarPorMapeamento = modulo.classificarPorMapeamento
    ItemJaClassificadoError = modulo.ItemJaClassificadoError
    ItemNaoEncontradoError = modulo.ItemNaoEncontradoError

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
    await prisma.categorySectorMapping.deleteMany({
      where: { legacyCategory: { startsWith: CATEGORIA_PREFIXO } },
    })
  })

  afterAll(async () => {
    await prisma.order.deleteMany({ where: { id: { startsWith: PREFIXO } } })
    await prisma.categorySectorMapping.deleteMany({
      where: { legacyCategory: { startsWith: CATEGORIA_PREFIXO } },
    })
  })

  it('duas classificações simultâneas em setores diferentes: uma vence e só há uma atividade', async () => {
    const { itemId } = await criarItem()

    const resultados = await Promise.allSettled([
      classificacao.markClassified({ itemId, sectorId: setorTelhas }),
      classificacao.markClassified({ itemId, sectorId: setorCorte }),
    ])

    const ok = vencedores(resultados)
    const falhas = perdedores(resultados)
    expect(ok).toHaveLength(1)
    expect(falhas).toHaveLength(1)
    expect(falhas[0].reason).toBeInstanceOf(ItemJaClassificadoError)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('CLASSIFIED')

    const atividades = await prisma.activity.findMany({ where: { orderItemId: itemId } })
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(ok[0].value.sectorId)
  })

  it('duas classificações simultâneas no mesmo setor: uma vence, sem duplicação nem erro de unicidade', async () => {
    const { itemId } = await criarItem()

    const resultados = await Promise.allSettled([
      classificacao.markClassified({ itemId, sectorId: setorTelhas }),
      classificacao.markClassified({ itemId, sectorId: setorTelhas }),
    ])

    expect(vencedores(resultados)).toHaveLength(1)
    const falhas = perdedores(resultados)
    expect(falhas).toHaveLength(1)
    expect(falhas[0].reason).toBeInstanceOf(ItemJaClassificadoError)

    const atividades = await prisma.activity.findMany({ where: { orderItemId: itemId } })
    expect(atividades).toHaveLength(1)
  })

  it('falha na criação da atividade desfaz a classificação do item', async () => {
    const { itemId } = await criarItem()

    await expect(
      classificacao.markClassified({ itemId, sectorId: 'setor-inexistente-v02' }),
    ).rejects.toBeTruthy()

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('PENDING_CLASSIFICATION')
    const atividades = await prisma.activity.findMany({ where: { orderItemId: itemId } })
    expect(atividades).toHaveLength(0)
  })

  it('item já classificado retorna conflito sem criar outra atividade', async () => {
    const { itemId } = await criarItem({ classificationStatus: 'CLASSIFIED' })
    await prisma.activity.create({ data: { orderItemId: itemId, sectorId: setorTelhas } })

    await expect(
      classificacao.markClassified({ itemId, sectorId: setorCorte }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)

    const atividades = await prisma.activity.findMany({ where: { orderItemId: itemId } })
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(setorTelhas)
  })

  it('item inexistente retorna não encontrado sem criar atividade', async () => {
    await expect(
      classificacao.markClassified({ itemId: 'item-inexistente-v02', sectorId: setorTelhas }),
    ).rejects.toBeInstanceOf(ItemNaoEncontradoError)

    const atividades = await prisma.activity.findMany({
      where: { orderItemId: 'item-inexistente-v02' },
    })
    expect(atividades).toHaveLength(0)
  })

  it('item pendente com atividade preexistente não ganha segunda atividade', async () => {
    const { itemId } = await criarItem()
    await prisma.activity.create({ data: { orderItemId: itemId, sectorId: setorTelhas } })

    await expect(
      classificacao.markClassified({ itemId, sectorId: setorCorte }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('PENDING_CLASSIFICATION')
    const atividades = await prisma.activity.findMany({ where: { orderItemId: itemId } })
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(setorTelhas)
  })

  it('classificação manual concorrendo com a automática efetiva apenas uma classificação', async () => {
    const categoria = `${CATEGORIA_PREFIXO}manual-auto`
    const { itemId } = await criarItem({ legacyCategory: categoria })
    await prisma.categorySectorMapping.create({
      data: { legacyCategory: categoria, sectorId: setorTelhas },
    })

    const deps = { classificacao, mapeamento }
    const resultados = await Promise.allSettled([
      classificarItem({ itemId, sectorId: setorCorte, userId: 'user-v02' }, { unidade }),
      classificarPorMapeamento(itemId, deps),
    ])

    expect(vencedores(resultados)).toHaveLength(1)
    const falhas = perdedores(resultados)
    expect(falhas).toHaveLength(1)
    expect(falhas[0].reason).toBeInstanceOf(ItemJaClassificadoError)

    const atividades = await prisma.activity.findMany({ where: { orderItemId: itemId } })
    expect(atividades).toHaveLength(1)
    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('CLASSIFIED')
  })
})
