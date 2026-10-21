import {
  ItemNaoClassificadoError,
  MotivoObrigatorioError,
  RegistrosOperacionaisError,
  corrigirSetorItem,
} from '../../../../../../modules/setores/corrigir-setor'
import {
  ItemNaoEncontradoError,
  SetorInvalidoError,
} from '../../../../../../modules/setores/classificar-item'
import { prismaCorrecaoSetorRepository } from '../../../../../../modules/setores/adapters/prisma-correcao-setor-repository'
import { autorizar } from '../../../../../../shared/http/autorizacao'

/**
 * PATCH /api/pedidos/itens/[itemId]/setor — corrige o setor de um item já
 * desmembrado (AD-006). Gerente e responsável pelo sistema informam o motivo;
 * o vendedor corrige sem motivo. Bloqueado por registros operacionais (409).
 */
export async function PATCH(request: Request, context: { params: Promise<{ itemId: string }> }) {
  const justificado = await autorizar(request, 'corrigir_setor_justificado')
  const auth = justificado.autorizado ? justificado : await autorizar(request, 'corrigir_setor')
  if (!auth.autorizado) return auth.resposta

  const { itemId } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const corpo = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {}
  const sectorId = corpo.sectorId
  const motivo = corpo.motivo ?? null
  if (typeof sectorId !== 'string' || (motivo !== null && typeof motivo !== 'string')) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const result = await corrigirSetorItem(
      {
        itemId,
        sectorId,
        motivo,
        exigeMotivo: justificado.autorizado,
        userId: auth.usuario.userId,
      },
      prismaCorrecaoSetorRepository,
    )
    return Response.json(result, { status: 200 })
  } catch (error) {
    if (error instanceof ItemNaoEncontradoError) {
      return Response.json({ error: 'item_not_found' }, { status: 404 })
    }
    if (error instanceof ItemNaoClassificadoError) {
      return Response.json({ error: 'item_not_classified' }, { status: 409 })
    }
    if (error instanceof RegistrosOperacionaisError) {
      return Response.json({ error: 'operational_records' }, { status: 409 })
    }
    if (error instanceof MotivoObrigatorioError) {
      return Response.json({ error: 'reason_required' }, { status: 400 })
    }
    if (error instanceof SetorInvalidoError) {
      return Response.json({ error: 'invalid_sector' }, { status: 400 })
    }
    throw error
  }
}
