import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { RoleCode } from '@/generated/prisma/client'
import { verificarSessao } from '@/modules/auth/sessao'
import { prismaUsuariosRepository } from '@/modules/usuarios/adapters/prisma-usuarios-repository'
import { pode, type Acao } from '@/modules/usuarios/permissoes'
import { rotaInicialDoPerfil } from '@/shared/ui/navegacao-perfil'
import { SESSION_COOKIE } from './auth-context'

export interface RequisitoAcessoPagina {
  /** Perfis explicitamente aceitos naquela área. */
  perfis?: readonly RoleCode[]
  /** Ações da matriz: ao menos uma libera a área. */
  acoes?: readonly Acao[]
}

/**
 * Guarda de página executado no servidor. Ocultar itens de menu não impede
 * acesso direto por URL; este guard repete a decisão de autorização antes de
 * renderizar a árvore da área restrita.
 *
 * Sem sessão (ou com usuário inativo) redireciona ao login. Sessão válida sem
 * o requisito da área volta à tela inicial do próprio perfil, preservando os
 * perfis que já têm acesso legítimo à página.
 */
export async function exigirAcessoPagina(
  requisito: RequisitoAcessoPagina = {},
): Promise<{ id: string; name: string; roles: RoleCode[] }> {
  const cookieStore = await cookies()
  const sessao = verificarSessao(cookieStore.get(SESSION_COOKIE)?.value)
  if (!sessao) redirect('/login')

  const usuario = await prismaUsuariosRepository.findById(sessao.userId)
  if (!usuario || usuario.status === 'INACTIVE' || usuario.roles.length === 0) {
    redirect('/login')
  }

  const permitido = requisito.perfis
    ? usuario.roles.some((perfil) => requisito.perfis?.includes(perfil))
    : requisito.acoes
      ? requisito.acoes.some((acao) => pode(usuario.roles, acao))
      : true

  if (!permitido) redirect(rotaInicialDoPerfil(usuario.roles[0]))

  return usuario
}
