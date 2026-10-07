'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { ApiError, apiPost } from '@/shared/http/api-client'

/** Tela do perfil entregue nesta fatia (operador). */
const TELA_DO_PERFIL = '/operador/fila'

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
      router.push(TELA_DO_PERFIL)
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
    <main className="grid min-h-screen place-items-center bg-brand-900 p-4">
      <div className="w-full max-w-md rounded-card border border-line bg-surface p-6 shadow-lg sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">3E Ferro e Aço</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">3E Operações</h1>
        <p className="mt-1 text-sm text-muted">Entre para acessar suas telas.</p>

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
    </main>
  )
}
