import type { RoleCode, UserStatus } from '@/generated/prisma/client'
import {
  UsuarioNaoEncontradoError,
  atualizarUsuario,
} from '../../../../modules/usuarios/gerenciar-usuarios'
import { prismaUsuariosRepository } from '../../../../modules/usuarios/adapters/prisma-usuarios-repository'
import { TODOS_PERFIS } from '../../../../modules/usuarios/permissoes'
import { autorizar } from '../../../../shared/http/autorizacao'

interface AtualizarUsuarioBody {
  name?: unknown
  senha?: unknown
  status?: unknown
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

function ehStatus(valor: unknown): valor is UserStatus {
  return valor === 'ACTIVE' || valor === 'INACTIVE'
}

/**
 * PATCH /api/usuarios/[id] — atualiza dados, perfis, setores e status; inativar
 * impede o login do usuário (AUTH-12, AUTH-13). Exige `gerenciar_usuarios`.
 */
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'gerenciar_usuarios')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const campos: AtualizarUsuarioBody =
    typeof body === 'object' && body !== null ? (body as AtualizarUsuarioBody) : {}
  const { name, senha, status, roles, sectorIds } = campos
  if (
    (name !== undefined && (typeof name !== 'string' || name.trim() === '')) ||
    (senha !== undefined && (typeof senha !== 'string' || senha === '')) ||
    (status !== undefined && !ehStatus(status)) ||
    (roles !== undefined && !ehListaDePerfis(roles)) ||
    (sectorIds !== undefined && !ehListaDeIds(sectorIds))
  ) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const usuario = await atualizarUsuario(
      id,
      { name, senha, status, roles, sectorIds },
      prismaUsuariosRepository,
    )
    return Response.json({ usuario }, { status: 200 })
  } catch (error) {
    if (error instanceof UsuarioNaoEncontradoError) {
      return Response.json({ error: 'user_not_found' }, { status: 404 })
    }
    throw error
  }
}
