'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { RoleCode } from '@/generated/prisma/client'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { rotaInicialDoPerfil } from '@/shared/ui/navegacao-perfil'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'

interface RespostaSessao {
  usuario: { id: string; roles: RoleCode[] }
}

/**
 * Tela de login com painel lateral (hero) a partir de 780 px e caixa de acesso
 * centralizada. Abaixo de 780 px só a caixa aparece (VIS-04, VIS-05). Os
 * rótulos, o foco visível e o erro acessível são preservados (VIS-06).
 */
export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setEnviando(true)

    try {
      await apiPost(
        '/api/auth/login',
        { email, senha },
        { redirectOnUnauthorized: false },
      )
      // A sessão guarda só o id; os perfis vêm do endpoint de sessão para
      // escolher a tela inicial do perfil (FEP-11).
      const sessao = await apiGet<RespostaSessao>('/api/auth/sessao', {
        redirectOnUnauthorized: false,
      })
      const perfil = sessao.usuario.roles[0]
      router.push(perfil ? rotaInicialDoPerfil(perfil) : '/')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setErro('E-mail ou senha inválidos. Verifique e tente novamente.')
      } else {
        setErro('Não foi possível entrar agora. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <main className="grid min-h-screen bg-brand-900 min-[780px]:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="hidden flex-col justify-between bg-gradient-to-br from-brand-900 to-brand-700 p-8 text-white min-[780px]:flex min-[780px]:p-16">
        <div>
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            3E Ferro e Aço
          </span>
          <p className="mt-6 max-w-xl text-3xl font-bold leading-tight">
            Pedidos, produção e expedição em uma visão integrada.
          </p>
          <p className="mt-4 max-w-xl text-base text-white/80">
            Interface para reduzir controles em papel, melhorar a rastreabilidade e apoiar o
            Planejamento e Controle da Produção.
          </p>
        </div>
      </section>

      <section className="grid place-items-center p-4 sm:p-8 min-[780px]:bg-bg">
        <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lg sm:p-8">
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="grid h-11 w-11 place-items-center rounded-lg bg-accent font-extrabold text-white"
            >
              3E
            </span>
            <div className="leading-tight">
              <h1 className="text-base font-semibold text-ink">3E Operações</h1>
              <p className="text-xs text-muted">Acesso ao sistema</p>
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-ink">Entrar</h2>
          <p className="mt-1 text-sm text-muted">
            Use suas credenciais para acessar as funcionalidades do seu perfil.
          </p>

          <form className="mt-6 grid gap-4" onSubmit={aoEnviar} noValidate>
            {erro ? (
              <Alert variant="error" title="Não foi possível entrar">
                {erro}
              </Alert>
            ) : null}

            <Field label="E-mail" required>
              {(props) => (
                <Input
                  {...props}
                  type="email"
                  name="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(evento) => setEmail(evento.target.value)}
                />
              )}
            </Field>

            <Field label="Senha" required>
              {(props) => (
                <Input
                  {...props}
                  type="password"
                  name="senha"
                  autoComplete="current-password"
                  required
                  value={senha}
                  onChange={(evento) => setSenha(evento.target.value)}
                />
              )}
            </Field>

            <Button type="submit" block disabled={enviando}>
              {enviando ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        </div>
      </section>
    </main>
  )
}
