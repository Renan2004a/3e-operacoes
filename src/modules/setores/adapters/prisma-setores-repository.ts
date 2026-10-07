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

interface MappingRow {
  id: string
  legacyCategory: string
  sectorId: string
  status: CategorySectorMapping['status']
  createdAt: Date
  updatedAt: Date
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

function toMapping(row: MappingRow): CategorySectorMapping {
  return {
    id: row.id,
    legacyCategory: row.legacyCategory,
    sectorId: row.sectorId,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
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

/** Implementação Prisma da porta `MapeamentoRepository`, com auditoria. */
export const prismaMapeamentoRepository: MapeamentoRepository = {
  async findByCategory(legacyCategory) {
    const row = await prisma.categorySectorMapping.findUnique({ where: { legacyCategory } })
    return row ? toMapping(row) : null
  },

  async findById(id) {
    const row = await prisma.categorySectorMapping.findUnique({ where: { id } })
    return row ? toMapping(row) : null
  },

  async create({ legacyCategory, sectorId }) {
    const row = await prisma.categorySectorMapping.create({
      data: { legacyCategory, sectorId, status: 'ACTIVE' },
    })
    return toMapping(row)
  },

  async update(id, { sectorId, status }) {
    const row = await prisma.categorySectorMapping.update({
      where: { id },
      data: { sectorId, status },
    })
    return toMapping(row)
  },

  async deactivate(id) {
    const row = await prisma.categorySectorMapping.update({
      where: { id },
      data: { status: 'INACTIVE' },
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
