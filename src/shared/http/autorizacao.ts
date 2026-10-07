import { prismaUsuariosRepository } from '@/modules/usuarios/adapters/prisma-usuarios-repository'
import { pode } from '@/modules/usuarios/permissoes'
import {
  NaoAutenticadoError,
  SemPermissaoError,
  exigirPerfil,
  type AuthRequest,
  type ExigirPerfilDeps,
  type SessaoUsuario,
} from './auth-context'

/** Perfis do usuário vêm do banco e a matriz de perfis decide a ação (AUTH-07, AUTH-08). */
export const depsAutorizacao: ExigirPerfilDeps = {
  async carregarPerfis(userId) {
    const usuario = await prismaUsuariosRepository.findById(userId)
    return usuario?.roles ?? []
  },
  pode,
}

export type ResultadoAutorizacao =
  | { autorizado: true; usuario: SessaoUsuario }
  | { autorizado: false; resposta: Response }

/**
 * Exige sessão válida e perfil autorizado para a ação, convertendo as falhas em
 * `401` (sem sessão) e `403` (sem perfil) (AUTH-04, AUTH-07).
 */
export async function autorizar(request: AuthRequest, acao: string): Promise<ResultadoAutorizacao> {
  try {
    return { autorizado: true, usuario: await exigirPerfil(request, acao, depsAutorizacao) }
  } catch (error) {
    if (error instanceof NaoAutenticadoError) {
      return {
        autorizado: false,
        resposta: Response.json({ error: 'unauthorized' }, { status: 401 }),
      }
    }
    if (error instanceof SemPermissaoError) {
      return { autorizado: false, resposta: Response.json({ error: 'forbidden' }, { status: 403 }) }
    }
    throw error
  }
}
