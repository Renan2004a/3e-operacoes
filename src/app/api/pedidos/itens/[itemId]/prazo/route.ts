import {
  ItemNaoEncontradoError,
  PrazoInvalidoError,
  definirPrazoItem,
} from '../../../../../../modules/prazos/prazo'
import { prismaPrazosRepository } from '../../../../../../modules/prazos/adapters/prisma-prazos-repository'
import { autorizar } from '../../../../../../shared/http/autorizacao'

/**
 * PATCH /api/pedidos/itens/[itemId]/prazo — define o prazo do item
 * (PRAZO-01, PRAZO-03, PRAZO-04, PRAZO-12). Restrito a gerente e vendedor.
 */
export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await autorizar(request, 'definir_prazo')
  if (!auth.autorizado) return auth.resposta

  const { itemId } = await context.params

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
    const item = await definirPrazoItem({ itemId, prazo }, prismaPrazosRepository)
    return Response.json({ item }, { status: 200 })
  } catch (error) {
    if (error instanceof ItemNaoEncontradoError) {
      return Response.json({ error: 'item_not_found' }, { status: 404 })
    }
    if (error instanceof PrazoInvalidoError) {
      return Response.json({ error: 'invalid_deadline' }, { status: 400 })
    }
    throw error
  }
}
