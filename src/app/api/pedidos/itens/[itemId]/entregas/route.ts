import { prismaExpedicaoRepository } from '../../../../../../modules/expedicao/adapters/prisma-expedicao-repository'
import { listarEntregas } from '../../../../../../modules/expedicao/historico-entregas'
import {
  EntregaAcimaDoDisponivelError,
  ItemNaoEncontradoError,
  MotivoExcecaoObrigatorioError,
  PapelSemPermissaoError,
  registrarEntrega,
} from '../../../../../../modules/expedicao/registrar-entrega'
import { QuantidadeInvalidaError } from '../../../../../../modules/producao/unidades'
import { requireInternalToken } from '../../../../../../shared/http/internal-auth'

interface EntregaBody {
  quantidade?: unknown
  excecao?: unknown
  motivoExcecao?: unknown
}

/**
 * POST /api/pedidos/itens/[itemId]/entregas — registra entrega total ou
 * parcial (EXP-03..07,13). Restrita à Expedição e ao Gerente; acima do
 * disponível é bloqueada, exceto com exceção do gerente com motivo e auditoria.
 * Enquanto a autenticação não existe, o usuário atual vem de `x-user-id`.
 */
export async function POST(request: Request, context: { params: Promise<{ itemId: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { itemId } = await context.params
  const usuarioId = request.headers.get('x-user-id') ?? ''

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const campos: EntregaBody =
    typeof body === 'object' && body !== null ? (body as EntregaBody) : {}
  const { quantidade, excecao, motivoExcecao } = campos
  const quantidadeValida = typeof quantidade === 'string' || typeof quantidade === 'number'
  const excecaoValida = excecao === undefined || typeof excecao === 'boolean'
  const motivoValido =
    motivoExcecao === undefined || motivoExcecao === null || typeof motivoExcecao === 'string'
  if (!quantidadeValida || !excecaoValida || !motivoValido) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const result = await registrarEntrega(
      {
        itemId,
        usuarioId,
        quantidade: quantidade as string | number,
        excecao: excecao as boolean | undefined,
        motivoExcecao: motivoExcecao as string | null | undefined,
      },
      prismaExpedicaoRepository,
    )
    return Response.json({ entrega: result.entrega, status: result.status }, { status: 201 })
  } catch (error) {
    if (error instanceof ItemNaoEncontradoError) {
      return Response.json({ error: 'item_not_found' }, { status: 404 })
    }
    if (error instanceof PapelSemPermissaoError) {
      return Response.json({ error: 'forbidden' }, { status: 403 })
    }
    if (error instanceof EntregaAcimaDoDisponivelError) {
      return Response.json({ error: 'above_available' }, { status: 409 })
    }
    if (error instanceof MotivoExcecaoObrigatorioError) {
      return Response.json({ error: 'override_reason_required' }, { status: 400 })
    }
    if (error instanceof QuantidadeInvalidaError) {
      return Response.json({ error: 'invalid_quantity' }, { status: 400 })
    }
    throw error
  }
}

/** GET /api/pedidos/itens/[itemId]/entregas — histórico de entregas do item (EXP-11,12). */
export async function GET(request: Request, context: { params: Promise<{ itemId: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { itemId } = await context.params

  try {
    const entregas = await listarEntregas(itemId, prismaExpedicaoRepository)
    return Response.json({ entregas }, { status: 200 })
  } catch (error) {
    if (error instanceof ItemNaoEncontradoError) {
      return Response.json({ error: 'item_not_found' }, { status: 404 })
    }
    throw error
  }
}
