import type { RoleCode, UserStatus } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { Usuario, UsuariosRepository } from '../gerenciar-usuarios'

interface UsuarioRow {
  id: string
  name: string
  email: string
  status: UserStatus
  createdAt: Date
  updatedAt: Date
  roles: { role: RoleCode }[]
  sectors: { sectorId: string }[]
}

const INCLUDE_PERFIS_SETORES = {
  roles: { select: { role: true } },
  sectors: { select: { sectorId: true } },
} as const

function toUsuario(row: UsuarioRow): Usuario {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    status: row.status,
    roles: row.roles.map((userRole) => userRole.role),
    sectorIds: row.sectors.map((userSector) => userSector.sectorId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function perfisCreate(roles: RoleCode[]) {
  return roles.map((role) => ({ role }))
}

function setoresCreate(sectorIds: string[]) {
  return sectorIds.map((sectorId) => ({ sectorId }))
}

/** Leitura administrativa de usuários (AUTH-07). */
export interface UsuariosLeituraRepository {
  /** Lista os usuários cadastrados com perfis e setores. */
  listar(): Promise<Usuario[]>
}

/** Implementação Prisma da porta `UsuariosRepository` (AUTH-10, AUTH-12, AUTH-13). */
export const prismaUsuariosRepository: UsuariosRepository & UsuariosLeituraRepository = {
  async findByEmail(email) {
    const row = await prisma.user.findUnique({
      where: { email },
      include: INCLUDE_PERFIS_SETORES,
    })
    return row ? toUsuario(row) : null
  },

  async findById(id) {
    const row = await prisma.user.findUnique({
      where: { id },
      include: INCLUDE_PERFIS_SETORES,
    })
    return row ? toUsuario(row) : null
  },

  async listar() {
    const rows = await prisma.user.findMany({
      include: INCLUDE_PERFIS_SETORES,
      orderBy: { createdAt: 'asc' },
    })
    return rows.map(toUsuario)
  },

  async create(input) {
    const row = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash: input.passwordHash,
        roles: { create: perfisCreate(input.roles) },
        sectors: { create: setoresCreate(input.sectorIds) },
      },
      include: INCLUDE_PERFIS_SETORES,
    })
    return toUsuario(row)
  },

  async update(id, input) {
    const row = await prisma.user.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.passwordHash !== undefined ? { passwordHash: input.passwordHash } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.roles !== undefined
          ? { roles: { deleteMany: {}, create: perfisCreate(input.roles) } }
          : {}),
        ...(input.sectorIds !== undefined
          ? { sectors: { deleteMany: {}, create: setoresCreate(input.sectorIds) } }
          : {}),
      },
      include: INCLUDE_PERFIS_SETORES,
    })
    return toUsuario(row)
  },

  async deactivate(id) {
    const row = await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      include: INCLUDE_PERFIS_SETORES,
    })
    return toUsuario(row)
  },
}
