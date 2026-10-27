import { prisma } from '@/shared/db/prisma'
import type { AlertasRepository, AtividadeComPrazo } from '../alertas'
import type { PrazoDefinido, PrazoRepository } from '../prazo'

/** Porta única de prazos, composta pelas portas de cada caso de uso. */
export interface PrazosRepository extends PrazoRepository, AlertasRepository {}

/** Implementação Prisma da porta `PrazosRepository`. */
export const prismaPrazosRepository: PrazosRepository = {
  async definirPrazoItem({ itemId, prazo, userId }): Promise<PrazoDefinido | null> {
    const existing = await prisma.orderItem.findUnique({
      where: { id: itemId },
      select: { id: true, deadlineAt: true },
    })
    if (!existing) return null

    const [row] = await prisma.$transaction([
      prisma.orderItem.update({
        where: { id: itemId },
        data: { deadlineAt: prazo },
        select: { id: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: userId ?? null,
          action: 'DEADLINE_CHANGED',
          entityType: 'OrderItem',
          entityId: itemId,
          beforeJson: { deadlineAt: existing.deadlineAt?.toISOString() ?? null },
          afterJson: { deadlineAt: prazo.toISOString() },
          reason: 'definir_prazo',
        },
      }),
    ])
    return { id: row.id, deadlineAt: prazo }
  },

  async definirPrazoAtividade({ atividadeId, prazo, userId }): Promise<PrazoDefinido | null> {
    const existing = await prisma.activity.findUnique({
      where: { id: atividadeId },
      select: { id: true, deadlineAt: true },
    })
    if (!existing) return null

    const [row] = await prisma.$transaction([
      prisma.activity.update({
        where: { id: atividadeId },
        data: { deadlineAt: prazo },
        select: { id: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: userId ?? null,
          action: 'DEADLINE_CHANGED',
          entityType: 'Activity',
          entityId: atividadeId,
          beforeJson: { deadlineAt: existing.deadlineAt?.toISOString() ?? null },
          afterJson: { deadlineAt: prazo.toISOString() },
          reason: 'definir_prazo_atividade',
        },
      }),
    ])
    return { id: row.id, deadlineAt: prazo }
  },

  async listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]> {
    const rows = await prisma.activity.findMany({
      where: { deadlineAt: { not: null } },
      select: { id: true, orderItemId: true, sectorId: true, status: true, deadlineAt: true },
    })
    return rows.map((row) => ({
      id: row.id,
      orderItemId: row.orderItemId,
      sectorId: row.sectorId,
      status: row.status,
      deadlineAt: row.deadlineAt,
    }))
  },
}
