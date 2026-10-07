import {
  ItemJaClassificadoError,
  ItemNaoEncontradoError,
  SetorInvalidoError,
  classificarItem,
} from '../../../../../../modules/setores/classificar-item'
import { prismaClassificacaoRepository } from '../../../../../../modules/setores/adapters/prisma-classificacao-repository'
import { prismaMapeamentoRepository } from '../../../../../../modules/setores/adapters/prisma-setores-repository'
import { requireInternalToken } from '../../../../../../shared/http/internal-auth'

/** POST /api/pedidos/itens/[itemId]/classificar — classificação manual do item. */
export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { itemId } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const sectorId =
    typeof body === 'object' && body !== null && 'sectorId' in body
      ? (body as { sectorId?: unknown }).sectorId
      : undefined
  if (typeof sectorId !== 'string') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const rawCategory =
    typeof body === 'object' && body !== null && 'legacyCategory' in body
      ? (body as { legacyCategory?: unknown }).legacyCategory
      : undefined
  const legacyCategory = typeof rawCategory === 'string' ? rawCategory : null

  try {
    const result = await classificarItem(
      { itemId, sectorId, legacyCategory },
      { classificacao: prismaClassificacaoRepository, mapeamento: prismaMapeamentoRepository },
    )
    return Response.json(
      { status: result.status, sectorId: result.sectorId, activityId: result.activityId },
      { status: 200 },
    )
  } catch (error) {
    if (error instanceof ItemNaoEncontradoError) {
      return Response.json({ error: 'item_not_found' }, { status: 404 })
    }
    if (error instanceof ItemJaClassificadoError) {
      return Response.json({ error: 'item_already_classified' }, { status: 409 })
    }
    if (error instanceof SetorInvalidoError) {
      return Response.json({ error: 'invalid_sector' }, { status: 400 })
    }
    throw error
  }
}
