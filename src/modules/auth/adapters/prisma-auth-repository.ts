import { prisma } from '@/shared/db/prisma'
import type { AuthRepository } from '../autenticar'

/** Implementação Prisma da porta `AuthRepository` (AUTH-01). */
export const prismaAuthRepository: AuthRepository = {
  async buscarPorEmail(email) {
    const row = await prisma.user.findUnique({
      where: { email },
      include: { roles: { select: { role: true } } },
    })
    if (!row) return null

    return {
      id: row.id,
      email: row.email,
      passwordHash: row.passwordHash,
      status: row.status,
      roles: row.roles.map((userRole) => userRole.role),
    }
  },
}
