import { prisma } from '@/shared/db/prisma'
import type { AlertasRepository, AtividadeComPrazo } from '../alertas'
import type { PrazoDefinido, PrazoRepository } from '../prazo'

/** Porta única de prazos, composta pelas portas de cada caso de uso. */
export interface PrazosRepository extends PrazoRepository, AlertasRepository {}

/** Normaliza o valor devolvido pelo MySQL para Date (ou null). */
function dataDoBanco(valor: unknown): Date | null {
  if (valor instanceof Date) return valor
  if (typeof valor === 'string') {
    const data = new Date(valor)
    return Number.isNaN(data.getTime()) ? null : data
  }
  return null
}

/** Implementação Prisma da porta `PrazosRepository`. */
export const prismaPrazosRepository: PrazosRepository = {
  async definirPrazoItem({ itemId, prazo, userId }): Promise<PrazoDefinido | null> {
    return prisma.$transaction(async (tx) => {
      // Bloqueia a linha antes de ler o valor anterior: duas alterações
      // simultâneas não podem registrar o mesmo "antes".
      const rows = await tx.$queryRaw<Array<{ prazo_entrega: Date | string | null }>>`
        SELECT prazo_entrega FROM pedidos_itens WHERE id = ${itemId} FOR UPDATE
      `
      if (rows.length === 0) return null

      const anterior = dataDoBanco(rows[0]?.prazo_entrega)
      const row = await tx.orderItem.update({
        where: { id: itemId },
        data: { deadlineAt: prazo },
        select: { id: true },
      })
      await tx.auditLog.create({
        data: {
          userId: userId ?? null,
          action: 'DEADLINE_CHANGED',
          entityType: 'OrderItem',
          entityId: itemId,
          beforeJson: { deadlineAt: anterior?.toISOString() ?? null },
          afterJson: { deadlineAt: prazo.toISOString() },
          reason: 'definir_prazo',
        },
      })
      return { id: row.id, deadlineAt: prazo }
    })
  },

  async definirPrazoAtividade({ atividadeId, prazo, userId }): Promise<PrazoDefinido | null> {
    return prisma.$transaction(async (tx) => {
      // Mesmo bloqueio para o prazo operacional do item.
      const rows = await tx.$queryRaw<Array<{ prazo_operacional: Date | string | null }>>`
        SELECT prazo_operacional FROM pedidos_itens WHERE id = ${atividadeId} FOR UPDATE
      `
      if (rows.length === 0) return null

      const anterior = dataDoBanco(rows[0]?.prazo_operacional)
      const row = await tx.orderItem.update({
        where: { id: atividadeId },
        data: { operationalDeadlineAt: prazo },
        select: { id: true },
      })
      await tx.auditLog.create({
        data: {
          userId: userId ?? null,
          action: 'DEADLINE_CHANGED',
          entityType: 'Activity',
          entityId: atividadeId,
          beforeJson: { deadlineAt: anterior?.toISOString() ?? null },
          afterJson: { deadlineAt: prazo.toISOString() },
          reason: 'definir_prazo_atividade',
        },
      })
      return { id: row.id, deadlineAt: prazo }
    })
  },

  async listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]> {
    const rows = await prisma.orderItem.findMany({
      where: { operationalDeadlineAt: { not: null }, sectorId: { not: null } },
      select: {
        id: true,
        sectorId: true,
        status: true,
        operationalDeadlineAt: true,
      },
    })
    return rows.map((row) => ({
      id: row.id,
      orderItemId: row.id,
      sectorId: row.sectorId ?? '',
      status: row.status,
      deadlineAt: row.operationalDeadlineAt,
    }))
  },
}
