import type { RoleCode } from '@/generated/prisma/client'
import {
  EmailJaExisteError,
  criarUsuario,
} from '../../../modules/usuarios/gerenciar-usuarios'
import { prismaUsuariosRepository } from '../../../modules/usuarios/adapters/prisma-usuarios-repository'
import { TODOS_PERFIS } from '../../../modules/usuarios/permissoes'
import { autorizar } from '../../../shared/http/autorizacao'

interface UsuarioBody {
  name?: unknown
  email?: unknown
  senha?: unknown
  roles?: unknown
  sectorIds?: unknown
}

function ehListaDePerfis(valor: unknown): valor is RoleCode[] {
  return (
    Array.isArray(valor) &&
    valor.every((item) => typeof item === 'string' && TODOS_PERFIS.includes(item as RoleCode))
  )
}

function ehListaDeIds(valor: unknown): valor is string[] {
  return Array.isArray(valor) && valor.every((item) => typeof item === 'string')
}

/** GET /api/usuarios — lista os usuários cadastrados; exige `gerenciar_usuarios` (AUTH-07). */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'gerenciar_usuarios')
  if (!auth.autorizado) return auth.resposta

  const usuarios = await prismaUsuariosRepository.listar()
  return Response.json({ usuarios }, { status: 200 })
}

/** POST /api/usuarios — cria o usuário com senha hasheada e associações N:N (AUTH-10, AUTH-11). */
export async function POST(request: Request) {
  const auth = await autorizar(request, 'gerenciar_usuarios')
  if (!auth.autorizado) return auth.resposta

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const campos: UsuarioBody = typeof body === 'object' && body !== null ? (body as UsuarioBody) : {}
  const { name, email, senha, roles, sectorIds } = campos
  if (
    typeof name !== 'string' ||
    name.trim() === '' ||
    typeof email !== 'string' ||
    email.trim() === '' ||
    typeof senha !== 'string' ||
    senha === '' ||
    (roles !== undefined && !ehListaDePerfis(roles)) ||
    (sectorIds !== undefined && !ehListaDeIds(sectorIds))
  ) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const usuario = await criarUsuario(
      { name, email, senha, roles, sectorIds },
      prismaUsuariosRepository,
    )
    return Response.json({ usuario }, { status: 201 })
  } catch (error) {
    if (error instanceof EmailJaExisteError) {
      return Response.json({ error: 'email_already_exists' }, { status: 409 })
    }
    throw error
  }
}
