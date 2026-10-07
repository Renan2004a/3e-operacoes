import {
  CategoriaJaMapeadaError,
  MapeamentoNaoEncontradoError,
  alterarMapeamento,
  criarMapeamento,
} from '../../../modules/setores/mapeamento'
import { prismaMapeamentoRepository } from '../../../modules/setores/adapters/prisma-setores-repository'
import { autorizar } from '../../../shared/http/autorizacao'

/** GET /api/mapeamentos?category=... — retorna o mapeamento da categoria (AUTH-14). */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'gerenciar_setores')
  if (!auth.autorizado) return auth.resposta

  const category = new URL(request.url).searchParams.get('category')
  if (!category) {
    return Response.json({ error: 'invalid_category' }, { status: 400 })
  }

  const mapping = await prismaMapeamentoRepository.findByCategory(category)
  if (!mapping) {
    return Response.json({ error: 'mapping_not_found' }, { status: 404 })
  }

  return Response.json({ mapping }, { status: 200 })
}

/** POST /api/mapeamentos — cria o mapeamento categoria → setor (AUTH-14). */
export async function POST(request: Request) {
  const auth = await autorizar(request, 'gerenciar_setores')
  if (!auth.autorizado) return auth.resposta

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const legacyCategory =
    typeof body === 'object' && body !== null && 'legacyCategory' in body
      ? (body as { legacyCategory?: unknown }).legacyCategory
      : undefined
  const sectorId =
    typeof body === 'object' && body !== null && 'sectorId' in body
      ? (body as { sectorId?: unknown }).sectorId
      : undefined
  if (typeof legacyCategory !== 'string' || typeof sectorId !== 'string') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const mapping = await criarMapeamento(
      { legacyCategory, sectorId },
      prismaMapeamentoRepository,
    )
    return Response.json({ mapping }, { status: 201 })
  } catch (error) {
    if (error instanceof CategoriaJaMapeadaError) {
      return Response.json({ error: 'category_already_mapped' }, { status: 409 })
    }
    throw error
  }
}

/** PATCH /api/mapeamentos — altera o setor de um mapeamento existente (AUTH-14). */
export async function PATCH(request: Request) {
  const auth = await autorizar(request, 'gerenciar_setores')
  if (!auth.autorizado) return auth.resposta

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const id =
    typeof body === 'object' && body !== null && 'id' in body
      ? (body as { id?: unknown }).id
      : undefined
  const sectorId =
    typeof body === 'object' && body !== null && 'sectorId' in body
      ? (body as { sectorId?: unknown }).sectorId
      : undefined
  if (typeof id !== 'string' || typeof sectorId !== 'string') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const mapping = await alterarMapeamento({ id, sectorId }, prismaMapeamentoRepository)
    return Response.json({ mapping }, { status: 200 })
  } catch (error) {
    if (error instanceof MapeamentoNaoEncontradoError) {
      return Response.json({ error: 'mapping_not_found' }, { status: 404 })
    }
    throw error
  }
}
