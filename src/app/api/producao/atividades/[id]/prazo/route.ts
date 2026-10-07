import {
  AtividadeNaoEncontradaError,
  PrazoInvalidoError,
  definirPrazoAtividade,
} from '../../../../../../modules/prazos/prazo'
import { prismaPrazosRepository } from '../../../../../../modules/prazos/adapters/prisma-prazos-repository'
import { autorizar } from '../../../../../../shared/http/autorizacao'

/**
 * PATCH /api/producao/atividades/[id]/prazo — define o prazo da atividade
 * (PRAZO-02, PRAZO-03, PRAZO-04, PRAZO-11). Restrito a gerente e vendedor.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'definir_prazo')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const prazo =
    typeof body === 'object' && body !== null && 'prazo' in body
      ? (body as { prazo?: unknown }).prazo
      : undefined
  if (typeof prazo !== 'string') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const atividade = await definirPrazoAtividade({ atividadeId: id, prazo }, prismaPrazosRepository)
    return Response.json({ atividade }, { status: 200 })
  } catch (error) {
    if (error instanceof AtividadeNaoEncontradaError) {
      return Response.json({ error: 'activity_not_found' }, { status: 404 })
    }
    if (error instanceof PrazoInvalidoError) {
      return Response.json({ error: 'invalid_deadline' }, { status: 400 })
    }
    throw error
  }
}
