import { prisma } from '@/shared/db/prisma'
import { autorizar } from '@/shared/http/autorizacao'

interface JsonPrazo {
  deadlineAt?: unknown
}

function prazoDoJson(valor: unknown): string | null {
  if (!valor || typeof valor !== 'object') return null
  const deadline = (valor as JsonPrazo).deadlineAt
  return typeof deadline === 'string' ? deadline : null
}

/**
 * GET /api/pedidos/itens/[itemId]/prazo/historico — alterações de prazo do item
 * (quem, quando, valor anterior e novo). Somente leitura (AD-009).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ itemId: string }> },
) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const { itemId } = await context.params
  const item = await prisma.orderItem.findUnique({ where: { id: itemId }, select: { id: true } })
  if (!item) return Response.json({ error: 'item_not_found' }, { status: 404 })

  const rows = await prisma.auditLog.findMany({
    where: { entityType: 'OrderItem', entityId: itemId, action: 'DEADLINE_CHANGED' },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      userId: true,
      beforeJson: true,
      afterJson: true,
      reason: true,
    },
  })

  const userIds = [...new Set(rows.map((row) => row.userId).filter(Boolean))] as string[]
  const usuarios = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      })
    : []
  const nomes = new Map(usuarios.map((usuario) => [usuario.id, usuario.name]))

  return Response.json({
    historico: rows.map((row) => ({
      id: row.id,
      createdAt: row.createdAt,
      userId: row.userId,
      userName: row.userId ? (nomes.get(row.userId) ?? null) : null,
      before: prazoDoJson(row.beforeJson),
      after: prazoDoJson(row.afterJson),
      reason: row.reason,
    })),
  })
}
