import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verificarSessao } from '@/modules/auth/sessao'
import { prismaUsuariosRepository } from '@/modules/usuarios/adapters/prisma-usuarios-repository'
import { SESSION_COOKIE } from '@/shared/http/auth-context'
import { rotaInicialDoPerfil } from '@/shared/ui/navegacao-perfil'

/**
 * Raiz do site: leva ao login (sem sessão) ou à tela inicial do perfil.
 * Perfil sem telas entregues vê uma página neutra (evita redirecionar para si).
 */
export default async function Home() {
  const cookieStore = await cookies()
  const sessao = verificarSessao(cookieStore.get(SESSION_COOKIE)?.value)
  if (!sessao) redirect('/login')

  const usuario = await prismaUsuariosRepository.findById(sessao.userId)
  if (!usuario || usuario.roles.length === 0) redirect('/login')

  const destino = rotaInicialDoPerfil(usuario.roles[0])
  if (destino !== '/') redirect(destino)

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-accent">3E Ferro e Aço</p>
      <h1 className="text-2xl font-semibold text-ink">3E Operações</h1>
      <p className="text-sm text-muted">
        Seu perfil ainda não tem telas disponíveis. Fale com o responsável pelo sistema.
      </p>
    </main>
  )
}
