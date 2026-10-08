import {
  CodigoSetorInvalidoError,
  SetorJaExisteError,
  criarSetor,
  listarSetores,
} from '../../../modules/setores/gerenciar-setores'
import { prismaSectorRepository } from '../../../modules/setores/adapters/prisma-setores-repository'
import { autorizar } from '../../../shared/http/autorizacao'

/** GET /api/setores — lista os setores ativos para classificação (LAC-04). */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const sectors = await listarSetores(prismaSectorRepository)
  return Response.json({ sectors }, { status: 200 })
}

/** POST /api/setores — cria um setor ativo (AUTH-14). */
export async function POST(request: Request) {
  const auth = await autorizar(request, 'gerenciar_setores')
  if (!auth.autorizado) return auth.resposta

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const code =
    typeof body === 'object' && body !== null && 'code' in body
      ? (body as { code?: unknown }).code
      : undefined
  const name =
    typeof body === 'object' && body !== null && 'name' in body
      ? (body as { name?: unknown }).name
      : undefined
  if (typeof code !== 'string' || typeof name !== 'string') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const sector = await criarSetor({ code, name }, prismaSectorRepository)
    return Response.json({ sector }, { status: 201 })
  } catch (error) {
    if (error instanceof CodigoSetorInvalidoError) {
      return Response.json({ error: 'invalid_code' }, { status: 400 })
    }
    if (error instanceof SetorJaExisteError) {
      return Response.json({ error: 'sector_already_exists' }, { status: 409 })
    }
    throw error
  }
}
