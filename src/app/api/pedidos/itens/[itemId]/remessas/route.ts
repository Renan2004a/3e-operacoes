import {
  RemessaDuplicadaError,
  RemessaInvalidaError,
  interpretarDataPrevista,
  programarRemessa,
} from '../../../../../../modules/expedicao/remessas'
import { prismaRemessaRepository } from '../../../../../../modules/expedicao/adapters/prisma-remessa-repository'
import { autorizar } from '../../../../../../shared/http/autorizacao'

/** POST /api/pedidos/itens/[itemId]/remessas — programa uma remessa (entrega prevista). */
export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const auth = await autorizar(request, 'programar_remessa')
  if (!auth.autorizado) return auth.resposta

  const { itemId } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const dados = (body ?? {}) as { remessa?: unknown; scheduledAt?: unknown; note?: unknown }
  const remessa = Number(dados.remessa)
  if (!Number.isInteger(remessa) || typeof dados.scheduledAt !== 'string') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const criada = await programarRemessa(
      {
        orderItemId: itemId,
        remessa,
        scheduledAt: interpretarDataPrevista(dados.scheduledAt),
        note: typeof dados.note === 'string' ? dados.note : null,
      },
      prismaRemessaRepository,
    )
    return Response.json({ remessa: criada }, { status: 201 })
  } catch (error) {
    if (error instanceof RemessaDuplicadaError) {
      return Response.json({ error: 'remessa_duplicada' }, { status: 409 })
    }
    if (error instanceof RemessaInvalidaError) {
      return Response.json({ error: 'invalid_body' }, { status: 400 })
    }
    throw error
  }
}
