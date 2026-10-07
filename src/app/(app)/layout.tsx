import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { RoleCode } from '@/generated/prisma/client'
import { verificarSessao } from '@/modules/auth/sessao'
import { prismaUsuariosRepository } from '@/modules/usuarios/adapters/prisma-usuarios-repository'
import { SESSION_COOKIE } from '@/shared/http/auth-context'
import { AppShell } from '@/shared/ui/app-shell'

/**
 * Layout das telas autenticadas. Resolve o perfil do usuário no servidor
 * (o endpoint de sessão expõe apenas o id; os perfis vêm do repositório
 * existente) e entrega a navegação ao shell (FE-04). Sem sessão, redireciona
 * ao login (FE-13).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const sessao = verificarSessao(cookieStore.get(SESSION_COOKIE)?.value)
  if (!sessao) redirect('/login')

  const usuario = await prismaUsuariosRepository.findById(sessao.userId)
  if (!usuario || usuario.roles.length === 0) redirect('/login')
  const perfil: RoleCode = usuario.roles[0]

  return (
    <AppShell perfil={perfil} usuarioNome={usuario?.name}>
      {children}
    </AppShell>
  )
}
