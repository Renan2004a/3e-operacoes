import type { Prisma, SectorCode as PrismaSectorCode } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { Sector, SectorRepository } from '../gerenciar-setores'
import type {
  CategorySectorMapping,
  MapeamentoAudit,
  MapeamentoRepository,
} from '../mapeamento'

interface SectorRow {
  id: string
  code: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

interface RuleRow {
  id: string
  valor: string
  setor_id: string
  ativo: boolean | number
  criado_em: Date
  atualizado_em: Date
}

function toSector(row: SectorRow): Sector {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toMapping(row: {
  id: string
  value: string
  sectorId: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}): CategorySectorMapping {
  return {
    id: row.id,
    legacyCategory: row.value,
    sectorId: row.sectorId,
    status: row.active ? 'ACTIVE' : 'INACTIVE',
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toMappingFromRaw(row: RuleRow): CategorySectorMapping {
  return toMapping({
    id: row.id,
    value: row.valor,
    sectorId: row.setor_id,
    active: Boolean(row.ativo),
    createdAt: row.criado_em,
    updatedAt: row.atualizado_em,
  })
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

/** Implementação Prisma da porta `SectorRepository`. */
export const prismaSectorRepository: SectorRepository = {
  async findByCode(code) {
    const row = await prisma.sector.findUnique({ where: { code: code as PrismaSectorCode } })
    return row ? toSector(row) : null
  },

  async listActive() {
    const rows = await prisma.sector.findMany({ where: { active: true }, orderBy: { code: 'asc' } })
    return rows.map(toSector)
  },

  async create({ code, name }) {
    const row = await prisma.sector.create({ data: { code: code as PrismaSectorCode, name } })
    return toSector(row)
  },

  async deactivate(id) {
    const row = await prisma.sector.update({ where: { id }, data: { active: false } })
    return toSector(row)
  },
}

const CATEGORIA = { matchType: 'CATEGORIA', operator: 'IGUAL' } as const

/** Implementação Prisma da porta `MapeamentoRepository`, com auditoria. */
export const prismaMapeamentoRepository: MapeamentoRepository = {
  async findByCategory(legacyCategory) {
    const row = await prisma.classificationRule.findFirst({
      where: { ...CATEGORIA, value: legacyCategory },
    })
    return row ? toMapping(row) : null
  },

  async findById(id) {
    const row = await prisma.classificationRule.findUnique({ where: { id } })
    return row && row.matchType === 'CATEGORIA' ? toMapping(row) : null
  },

  async listAll() {
    const rows = await prisma.classificationRule.findMany({
      where: CATEGORIA,
      orderBy: { value: 'asc' },
    })
    return rows.map(toMapping)
  },

  async create({ legacyCategory, sectorId }) {
    const row = await prisma.classificationRule.create({
      data: { ...CATEGORIA, value: legacyCategory, sectorId, active: true },
    })
    return toMapping(row)
  },

  async update(id, { sectorId, status }) {
    const row = await prisma.classificationRule.update({
      where: { id },
      data: { sectorId, active: status === 'ACTIVE' },
    })
    return toMapping(row)
  },

  async deactivate(id) {
    const row = await prisma.classificationRule.update({
      where: { id },
      data: { active: false },
    })
    return toMapping(row)
  },

  async recordAudit(entry: MapeamentoAudit) {
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        userId: entry.userId ?? null,
        ...(entry.beforeJson !== null ? { beforeJson: toJson(entry.beforeJson) } : {}),
        ...(entry.afterJson !== null ? { afterJson: toJson(entry.afterJson) } : {}),
      },
    })
  },
}

/**
 * Implementação transacional da porta de mapeamento. A leitura bloqueante
 * (`FOR UPDATE`) continua serializando a criação/reativação da categoria.
 */
export function criarMapeamentoEmTransacao(
  cliente: Prisma.TransactionClient,
): MapeamentoRepository {
  async function findByCategory(legacyCategory: string): Promise<CategorySectorMapping | null> {
    const rows = await cliente.$queryRaw<RuleRow[]>`
      SELECT id, valor, setor_id, ativo, criado_em, atualizado_em
      FROM \`regras_classificacao\`
      WHERE tipo_correspondencia = 'CATEGORIA' AND operador = 'IGUAL' AND valor = ${legacyCategory}
      FOR UPDATE
    `
    const row = rows[0] ?? null
    return row ? toMappingFromRaw(row) : null
  }

  return {
    findByCategory,
    findById: async (id) => {
      const row = await cliente.classificationRule.findUnique({ where: { id } })
      return row && row.matchType === 'CATEGORIA' ? toMapping(row) : null
    },
    listAll: async () => {
      const rows = await cliente.classificationRule.findMany({
        where: CATEGORIA,
        orderBy: { value: 'asc' },
      })
      return rows.map(toMapping)
    },
    create: async ({ legacyCategory, sectorId }) => {
      const row = await cliente.classificationRule.create({
        data: { ...CATEGORIA, value: legacyCategory, sectorId, active: true },
      })
      return toMapping(row)
    },
    update: async (id, { sectorId, status }) => {
      const row = await cliente.classificationRule.update({
        where: { id },
        data: { sectorId, active: status === 'ACTIVE' },
      })
      return toMapping(row)
    },
    deactivate: async (id) => {
      const row = await cliente.classificationRule.update({
        where: { id },
        data: { active: false },
      })
      return toMapping(row)
    },
    recordAudit: async (entry: MapeamentoAudit) => {
      await cliente.auditLog.create({
        data: {
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          userId: entry.userId ?? null,
          ...(entry.beforeJson !== null ? { beforeJson: toJson(entry.beforeJson) } : {}),
          ...(entry.afterJson !== null ? { afterJson: toJson(entry.afterJson) } : {}),
        },
      })
    },
  }
}
