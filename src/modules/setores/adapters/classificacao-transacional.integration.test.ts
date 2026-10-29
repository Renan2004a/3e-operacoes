import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Testes de integração da unidade transacional da classificação manual (V06)
 * contra MySQL real. Só executam com `RUN_INTEGRATION_TESTS=1` e um banco cujo
 * nome contenha `integration` ou `test`, seguindo o padrão dos demais testes de
 * integração. O banco usado é exclusivo de V06 (`v06_integration`).
 *
 * Falhas controladas existem apenas neste arquivo (wrapper de teste sobre os
 * repositórios transacionais reais), nunca em produção.
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
let criarClassificacaoEmTransacao: typeof import('./prisma-classificacao-repository').criarClassificacaoEmTransacao
let criarMapeamentoEmTransacao: typeof import('./prisma-setores-repository').criarMapeamentoEmTransacao
let ItemJaClassificadoError: typeof import('../classificar-item').ItemJaClassificadoError

let setorTelhas: string
let setorCorte: string
let sequencia = 0

type ClassificacaoEmTransacao = import('../classificar-item').ClassificacaoEmTransacao
type MapeamentoRepository = import('../mapeamento').MapeamentoRepository
type UnidadeTrabalhoClassificacao = import('../classificar-item').UnidadeTrabalhoClassificacao

async function criarItem(overrides: { legacyCategory?: string | null } = {}) {
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
      legacyCategory: overrides.legacyCategory ?? null,
      classificationStatus: 'PENDING_CLASSIFICATION',
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

/**
 * Sincronização controlada: ambas as ações partem no mesmo tick (portão único),
 * sem dependência de sleeps. O MySQL resolve a ordenação real por locks.
 */
async function emConcorrencia<T>(
  acoes: Array<() => Promise<T>>,
): Promise<PromiseSettledResult<T>[]> {
  let abrir!: () => void
  const portao = new Promise<void>((resolve) => {
    abrir = resolve
  })
  const execucoes = acoes.map((acao) => portao.then(acao))
  abrir()
  return Promise.allSettled(execucoes)
}

/**
 * Unidade com falha controlada (só ambiente de teste): repositórios transacionais
 * reais do MySQL, com um método escolhido interrompido — a transação买房 abre e o
 * rollback do MySQL prova a atomicidade da unidade.
 */
function criarUnidadeComFalha(
  local: 'criarAtividade' | 'recordAudit',
  mensagem: string,
): UnidadeTrabalhoClassificacao {
  return {
    async transacional(fn) {
      return prisma.$transaction(async (tx) => {
        const classificacao = criarClassificacaoEmTransacao(tx)
        const mapeamento = criarMapeamentoEmTransacao(tx)

        const classificacaoComFalha: ClassificacaoEmTransacao =
          local === 'criarAtividade'
            ? {
                ...classificacao,
                criarAtividade: async (): Promise<never> => {
                  throw new Error(mensagem)
                },
              }
            : classificacao

        const mapeamentoComFalha: MapeamentoRepository =
          local === 'recordAudit'
            ? {
                ...mapeamento,
                recordAudit: async (): Promise<never> => {
                  throw new Error(mensagem)
                },
              }
            : mapeamento

        return fn({ classificacao: classificacaoComFalha, mapeamento: mapeamentoComFalha })
      })
    },
  }
}

async function mapeamentoDaCategoria(legacyCategory: string) {
  return prisma.categorySectorMapping.findUnique({ where: { legacyCategory } })
}

async function auditoriasDoMapeamento(mappingId: string) {
  return prisma.auditLog.findMany({
    where: { entityType: 'CategorySectorMapping', entityId: mappingId },
    orderBy: { createdAt: 'asc' },
  })
}

async function atividadesDoItem(itemId: string) {
  return prisma.activity.findMany({ where: { orderItemId: itemId }, orderBy: { id: 'asc' } })
}

async function limparPrefixoV06() {
  const mappings = await prisma.categorySectorMapping.findMany({
    where: { legacyCategory: { startsWith: CATEGORIA_PREFIXO } },
    select: { id: true },
  })
  await prisma.auditLog.deleteMany({
    where: { entityType: 'CategorySectorMapping', entityId: { in: mappings.map((m) => m.id) } },
  })
  await prisma.categorySectorMapping.deleteMany({
    where: { legacyCategory: { startsWith: CATEGORIA_PREFIXO } },
  })
  await prisma.order.deleteMany({ where: { id: { startsWith: PREFIXO } } })
}

describe.skipIf(!ativo)('classificação transacional no MySQL (integração V06)', () => {
  beforeAll(async () => {
    prisma = (await import('@/shared/db/prisma')).prisma
    const modulo = await import('../classificar-item')
    classificarItem = modulo.classificarItem
    ItemJaClassificadoError = modulo.ItemJaClassificadoError
    unidade = (await import('./prisma-unidade-trabalho-classificacao'))
      .prismaUnidadeTrabalhoClassificacao
    const adapters = await import('./prisma-classificacao-repository')
    criarClassificacaoEmTransacao = adapters.criarClassificacaoEmTransacao
    criarMapeamentoEmTransacao = (await import('./prisma-setores-repository'))
      .criarMapeamentoEmTransacao

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
    await limparPrefixoV06()
  })

  afterAll(async () => {
    await limparPrefixoV06()
  })

  it('1) categoria nova: item, atividade, mapeamento e auditoria com autor correto', async () => {
    const categoria = `${CATEGORIA_PREFIXO}nova`
    const { itemId } = await criarItem({ legacyCategory: categoria })

    const resultado = await classificarItem(
      { itemId, sectorId: setorTelhas, userId: 'user-v06-1' },
      { unidade },
    )

    expect(resultado).toMatchObject({ status: 'CLASSIFIED', sectorId: setorTelhas })

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('CLASSIFIED')

    const atividades = await atividadesDoItem(itemId)
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(setorTelhas)

    const mapping = await mapeamentoDaCategoria(categoria)
    expect(mapping).toMatchObject({ sectorId: setorTelhas, status: 'ACTIVE' })

    const auditorias = await auditoriasDoMapeamento(mapping!.id)
    expect(auditorias).toHaveLength(1)
    expect(auditorias[0]).toMatchObject({
      action: 'CREATE',
      entityType: 'CategorySectorMapping',
      userId: 'user-v06-1',
      beforeJson: null,
      afterJson: {
        legacyCategory: categoria,
        sectorId: setorTelhas,
        status: 'ACTIVE',
      },
    })
  })

  it('2) falha após criar o mapeamento: rollback de item, mapeamento, auditoria e atividade', async () => {
    const categoria = `${CATEGORIA_PREFIXO}rollback-create`
    const { itemId } = await criarItem({ legacyCategory: categoria })
    const unidadeComFalha = criarUnidadeComFalha('criarAtividade', 'falha-controlada-v06-2')

    await expect(
      classificarItem(
        { itemId, sectorId: setorTelhas, userId: 'user-v06-2' },
        { unidade: unidadeComFalha },
      ),
    ).rejects.toThrow('falha-controlada-v06-2')

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('PENDING_CLASSIFICATION')
    expect(await atividadesDoItem(itemId)).toHaveLength(0)
    expect(await mapeamentoDaCategoria(categoria)).toBeNull()
  })

  it('3) falha após reativação: estado e setor anteriores restaurados', async () => {
    const categoria = `${CATEGORIA_PREFIXO}rollback-reativar`
    const { itemId } = await criarItem({ legacyCategory: categoria })
    const seed = await prisma.categorySectorMapping.create({
      data: {
        legacyCategory: categoria,
        sectorId: setorTelhas,
        status: 'INACTIVE',
      },
    })

    const unidadeComFalha = criarUnidadeComFalha('criarAtividade', 'falha-controlada-v06-3')

    await expect(
      classificarItem(
        { itemId, sectorId: setorCorte, userId: 'user-v06-3' },
        { unidade: unidadeComFalha },
      ),
    ).rejects.toThrow('falha-controlada-v06-3')

    const mapping = await prisma.categorySectorMapping.findUnique({ where: { id: seed.id } })
    expect(mapping).toMatchObject({
      legacyCategory: categoria,
      sectorId: setorTelhas,
      status: 'INACTIVE',
    })
    expect((await auditoriasDoMapeamento(seed.id)).length).toBe(0)
    expect((await atividadesDoItem(itemId)).length).toBe(0)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('PENDING_CLASSIFICATION')
  })

  it('4) falha de auditoria: nenhuma alteração parcial da solicitação', async () => {
    const categoria = `${CATEGORIA_PREFIXO}rollback-auditoria`
    const { itemId } = await criarItem({ legacyCategory: categoria })
    const unidadeComFalha = criarUnidadeComFalha('recordAudit', 'falha-controlada-v06-4')

    await expect(
      classificarItem(
        { itemId, sectorId: setorTelhas, userId: 'user-v06-4' },
        { unidade: unidadeComFalha },
      ),
    ).rejects.toThrow('falha-controlada-v06-4')

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('PENDING_CLASSIFICATION')
    expect(await atividadesDoItem(itemId)).toHaveLength(0)
    expect(await mapeamentoDaCategoria(categoria)).toBeNull()
  })

  it('5) mapeamento ativo permanece: setor preservado e sem auditoria indevida', async () => {
    const categoria = `${CATEGORIA_PREFIXO}ativa-vencedora`
    const { itemId } = await criarItem({ legacyCategory: categoria })
    const seed = await prisma.categorySectorMapping.create({
      data: { legacyCategory: categoria, sectorId: setorTelhas, status: 'ACTIVE' },
    })
    const antes = await prisma.categorySectorMapping.findUnique({ where: { id: seed.id } })

    const resultado = await classificarItem(
      { itemId, sectorId: setorCorte, userId: 'user-v06-5' },
      { unidade },
    )

    expect(resultado).toMatchObject({ status: 'CLASSIFIED', sectorId: setorCorte })

    const depois = await prisma.categorySectorMapping.findUnique({ where: { id: seed.id } })
    expect(depois).toMatchObject({
      sectorId: setorTelhas,
      status: 'ACTIVE',
      updatedAt: antes!.updatedAt,
    })
    expect((await auditoriasDoMapeamento(seed.id)).length).toBe(0)

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('CLASSIFIED')
    const atividades = await atividadesDoItem(itemId)
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(setorCorte)
  })

  it('6) item sem categoria: classificação sem mapeamento e sem auditoria', async () => {
    const { itemId } = await criarItem({ legacyCategory: null })

    const resultado = await classificarItem(
      { itemId, sectorId: setorTelhas, userId: 'user-v06-6' },
      { unidade },
    )

    expect(resultado).toMatchObject({ status: 'CLASSIFIED', sectorId: setorTelhas })

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('CLASSIFIED')
    const atividades = await atividadesDoItem(itemId)
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(setorTelhas)

    const mappings = await prisma.categorySectorMapping.findMany({
      where: { legacyCategory: { startsWith: CATEGORIA_PREFIXO } },
    })
    expect(mappings).toHaveLength(0)
  })

  it('7) mesmo item concorrendo: uma vencedora, outra em conflito, sem efeitos da perdedora', async () => {
    const categoria = `${CATEGORIA_PREFIXO}corrida-item`
    const { itemId } = await criarItem({ legacyCategory: categoria })

    const resultados = await emConcorrencia([
      () => classificarItem({ itemId, sectorId: setorTelhas, userId: 'user-v06-7a' }, { unidade }),
      () => classificarItem({ itemId, sectorId: setorCorte, userId: 'user-v06-7b' }, { unidade }),
    ])

    const ok = vencedores(resultados)
    const conflitos = perdedores(resultados)
    expect(ok).toHaveLength(1)
    expect(conflitos).toHaveLength(1)
    expect(conflitos[0].reason).toBeInstanceOf(ItemJaClassificadoError)

    const venceu = ok[0].value
    const setorVencedor = venceu.sectorId as string
    const usuarioVencedor = setorVencedor === setorTelhas ? 'user-v06-7a' : 'user-v06-7b'

    const item = await prisma.orderItem.findUnique({ where: { id: itemId } })
    expect(item?.classificationStatus).toBe('CLASSIFIED')

    const atividades = await atividadesDoItem(itemId)
    expect(atividades).toHaveLength(1)
    expect(atividades[0].sectorId).toBe(setorVencedor)

    const mapping = await mapeamentoDaCategoria(categoria)
    expect(mapping).toMatchObject({ sectorId: setorVencedor, status: 'ACTIVE' })

    const auditorias = await auditoriasDoMapeamento(mapping!.id)
    expect(auditorias).toHaveLength(1)
    expect(auditorias[0]).toMatchObject({
      action: 'CREATE',
      userId: usuarioVencedor,
    })
  })

  it('8) itens distintos com categoria nova: um mapeamento, atividades corretas, sem erro não tratado', async () => {
    const categoria = `${CATEGORIA_PREFIXO}corrida-categoria`
    const pedidoUm = await criarItem({ legacyCategory: categoria })
    const pedidoDois = await criarItem({ legacyCategory: categoria })

    const resultados = await emConcorrencia([
      () =>
        classificarItem(
          { itemId: pedidoUm.itemId, sectorId: setorTelhas, userId: 'user-v06-8a' },
          { unidade },
        ),
      () =>
        classificarItem(
          { itemId: pedidoDois.itemId, sectorId: setorCorte, userId: 'user-v06-8b' },
          { unidade },
        ),
    ])

    expect(perdedores(resultados)).toHaveLength(0)
    expect(vencedores(resultados)).toHaveLength(2)

    const itemUm = await prisma.orderItem.findUnique({ where: { id: pedidoUm.itemId } })
    const itemDois = await prisma.orderItem.findUnique({ where: { id: pedidoDois.itemId } })
    expect(itemUm?.classificationStatus).toBe('CLASSIFIED')
    expect(itemDois?.classificationStatus).toBe('CLASSIFIED')

    const atividadesUm = await atividadesDoItem(pedidoUm.itemId)
    const atividadesDois = await atividadesDoItem(pedidoDois.itemId)
    expect(atividadesUm).toHaveLength(1)
    expect(atividadesUm[0].sectorId).toBe(setorTelhas)
    expect(atividadesDois).toHaveLength(1)
    expect(atividadesDois[0].sectorId).toBe(setorCorte)

    const mappings = await prisma.categorySectorMapping.findMany({
      where: { legacyCategory: categoria },
    })
    expect(mappings).toHaveLength(1)
    expect(mappings[0].status).toBe('ACTIVE')
    expect(mappings[0].sectorId === setorTelhas || mappings[0].sectorId === setorCorte).toBe(true)

    const auditorias = await auditoriasDoMapeamento(mappings[0].id)
    expect(auditorias).toHaveLength(1)
    expect(auditorias[0]).toMatchObject({
      action: 'CREATE',
      userId: mappings[0].sectorId === setorTelhas ? 'user-v06-8a' : 'user-v06-8b',
      afterJson: { legacyCategory: categoria, sectorId: mappings[0].sectorId, status: 'ACTIVE' },
    })
  })

  it('9) reativação concorrente: estado e auditoria consistentes', async () => {
    const categoria = `${CATEGORIA_PREFIXO}corrida-reativar`
    const seed = await prisma.categorySectorMapping.create({
      data: { legacyCategory: categoria, sectorId: setorTelhas, status: 'INACTIVE' },
    })
    const pedidoUm = await criarItem({ legacyCategory: categoria })
    const pedidoDois = await criarItem({ legacyCategory: categoria })

    const resultados = await emConcorrencia([
      () =>
        classificarItem(
          { itemId: pedidoUm.itemId, sectorId: setorCorte, userId: 'user-v06-9a' },
          { unidade },
        ),
      () =>
        classificarItem(
          { itemId: pedidoDois.itemId, sectorId: setorCorte, userId: 'user-v06-9b' },
          { unidade },
        ),
    ])

    expect(perdedores(resultados)).toHaveLength(0)
    expect(vencedores(resultados)).toHaveLength(2)

    const itemUm = await prisma.orderItem.findUnique({ where: { id: pedidoUm.itemId } })
    const itemDois = await prisma.orderItem.findUnique({ where: { id: pedidoDois.itemId } })
    expect(itemUm?.classificationStatus).toBe('CLASSIFIED')
    expect(itemDois?.classificationStatus).toBe('CLASSIFIED')
    const atividadesUm = await atividadesDoItem(pedidoUm.itemId)
    const atividadesDois = await atividadesDoItem(pedidoDois.itemId)
    expect(atividadesUm[0].sectorId).toBe(setorCorte)
    expect(atividadesDois[0].sectorId).toBe(setorCorte)

    const mapping = await prisma.categorySectorMapping.findUnique({ where: { id: seed.id } })
    expect(mapping).toMatchObject({ status: 'ACTIVE', sectorId: setorCorte })

    const auditorias = await auditoriasDoMapeamento(seed.id)
    expect(auditorias).toHaveLength(1)
    expect(auditorias[0]).toMatchObject({
      action: 'UPDATE',
      beforeJson: { sectorId: setorTelhas, status: 'INACTIVE' },
      afterJson: { sectorId: setorCorte, status: 'ACTIVE' },
    })
    expect(['user-v06-9a', 'user-v06-9b']).toContain(auditorias[0].userId)
  })
})
