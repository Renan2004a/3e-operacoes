import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Regressão de P1: duas solicitações simultâneas do mesmo pedido devem
 * reconciliar na mesma linha de `jobs_integracao`, sem erro de unicidade e com
 * uma única requisição criando/despachando o job.
 *
 * Só executa com `RUN_INTEGRATION_TESTS=1` em banco de teste/integração.
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

let prisma: import('@/generated/prisma/client').PrismaClient
let repo: import('../solicitar-importacao').SolicitacaoImportacaoRepository

const NUMERO = '99010'

describe.skipIf(!ativo)('solicitação concorrente de importação no MySQL (P1)', () => {
  beforeAll(async () => {
    prisma = (await import('@/shared/db/prisma')).prisma
    repo = (await import('./prisma-integracao-repository')).prismaIntegracaoRepository
    for (const [id, email] of [
      ['p1-user-a', 'p1-a@teste.local'],
      ['p1-user-b', 'p1-b@teste.local'],
    ]) {
      await prisma.user.upsert({
        where: { id },
        update: {},
        create: { id, name: id, email, passwordHash: 'hash-de-teste' },
      })
    }
  })

  beforeEach(async () => {
    await prisma.auditLog.deleteMany({ where: { entityType: 'IntegrationJob' } })
    await prisma.integrationJob.deleteMany({})
  })

  afterAll(async () => {
    await prisma.auditLog.deleteMany({ where: { entityType: 'IntegrationJob' } })
    await prisma.integrationJob.deleteMany({})
  })

  it('duas solicitações simultâneas criam um job, duas auditorias e um único vencedor', async () => {
    const { solicitarImportacao } = await import('../solicitar-importacao')
    const now = new Date('2026-11-03T18:00:00.000Z')

    const [a, b] = await Promise.all([
      solicitarImportacao({ orderNumber: NUMERO, now, requestedByUserId: 'p1-user-a' }, repo),
      solicitarImportacao({ orderNumber: NUMERO, now, requestedByUserId: 'p1-user-b' }, repo),
    ])

    expect(a.jobId).toBe(b.jobId)
    expect([a.reused, b.reused].sort()).toEqual([false, true])

    const jobs = await prisma.integrationJob.findMany({
      where: { legacyOrderNumber: NUMERO },
    })
    expect(jobs).toHaveLength(1)

    const auditorias = await prisma.auditLog.findMany({
      where: { entityType: 'IntegrationJob', entityId: jobs[0].id, action: 'IMPORT_REQUESTED' },
    })
    expect(auditorias).toHaveLength(2)
    expect(
      auditorias
        .map((auditoria) => (auditoria.afterJson as { requestKind?: string }).requestKind)
        .sort(),
    ).toEqual(['NEW_ATTEMPT', 'REUSED_JOB'])
  })
})
