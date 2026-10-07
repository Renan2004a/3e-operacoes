import { AtividadeNaoEncontradaError } from '../../../../../../modules/producao/registrar-execucao'
import { definirPrioridade } from '../../../../../../modules/producao/prioridade'
import { prismaProducaoRepository } from '../../../../../../modules/producao/adapters/prisma-producao-repository'
import { requireInternalToken } from '../../../../../../shared/http/internal-auth'

/** PATCH /api/producao/atividades/[id]/prioridade — define a prioridade (PROD-11). */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const prioridade =
    typeof body === 'object' && body !== null && 'prioridade' in body
      ? (body as { prioridade?: unknown }).prioridade
      : undefined
  if (typeof prioridade !== 'number' || !Number.isFinite(prioridade)) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const atividade = await definirPrioridade(
      { atividadeId: id, prioridade },
      prismaProducaoRepository,
    )
    return Response.json({ atividade }, { status: 200 })
  } catch (error) {
    if (error instanceof AtividadeNaoEncontradaError) {
      return Response.json({ error: 'activity_not_found' }, { status: 404 })
    }
    throw error
  }
}
