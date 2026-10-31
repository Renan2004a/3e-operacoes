import {
  RemessaNaoEncontradaError,
  confirmarRemessa,
  removerRemessa,
} from '../../../../../modules/expedicao/remessas'
import { prismaRemessaRepository } from '../../../../../modules/expedicao/adapters/prisma-remessa-repository'
import { autorizar } from '../../../../../shared/http/autorizacao'

/** PATCH /api/pedidos/remessas/[id] — confirma a remessa (entregue). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'programar_remessa')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params
  try {
    const remessa = await confirmarRemessa(
      { id, now: new Date(), userId: auth.usuario.userId },
      prismaRemessaRepository,
    )
    return Response.json({ remessa }, { status: 200 })
  } catch (error) {
    if (error instanceof RemessaNaoEncontradaError) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    throw error
  }
}

/** DELETE /api/pedidos/remessas/[id] — remove a remessa programada. */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'programar_remessa')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params
  let motivo = new URL(request.url).searchParams.get('motivo') ?? undefined
  try {
    const body = (await request.json()) as { motivo?: unknown } | null
    if (body && typeof body.motivo === 'string') motivo = body.motivo
  } catch {
    // Corpo opcional: a anulação continua válida sem motivo explícito.
  }
  try {
    await removerRemessa({ id, motivo, userId: auth.usuario.userId }, prismaRemessaRepository)
    return new Response(null, { status: 204 })
  } catch (error) {
    if (error instanceof RemessaNaoEncontradaError) {
      return Response.json({ error: 'not_found' }, { status: 404 })
    }
    throw error
  }
}
