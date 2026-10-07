import {
  CodigoSetorInvalidoError,
  SetorJaExisteError,
  criarSetor,
  listarSetores,
} from '../../../modules/setores/gerenciar-setores'
import { prismaSectorRepository } from '../../../modules/setores/adapters/prisma-setores-repository'
import { requireInternalToken } from '../../../shared/http/internal-auth'

/** GET /api/setores — lista os setores ativos. */
export async function GET(request: Request) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const sectors = await listarSetores(prismaSectorRepository)
  return Response.json({ sectors }, { status: 200 })
}

/** POST /api/setores — cria um setor ativo. */
export async function POST(request: Request) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

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
