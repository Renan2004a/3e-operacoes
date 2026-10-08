'use client'

import { useCallback, useEffect, useState } from 'react'
import type { RoleCode } from '@/generated/prisma/client'
import { TODOS_PERFIS } from '@/modules/usuarios/permissoes'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'

interface Usuario {
  id: string
  name: string
  email: string
  status: string
  roles: RoleCode[]
  sectorIds: string[]
}

interface Setor {
  id: string
  code: string
  name: string
  active: boolean
}

const ROTULO_PERFIL: Record<RoleCode, string> = {
  OPERATOR: 'Operador',
  PRODUCTION_MANAGER: 'Gerente de Produção',
  SELLER: 'Vendedor',
  SHIPPING: 'Expedição',
  SYSTEM_RESPONSIBLE: 'Responsável pelo Sistema',
  TECHNICAL_RESPONSIBLE: 'Responsável Técnico',
}

/** Administração de usuários: cria com perfis e setores e trata 409/403 (FEP-08). */
export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [roles, setRoles] = useState<RoleCode[]>([])
  const [sectorIds, setSectorIds] = useState<string[]>([])
  const [erroForm, setErroForm] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const carregar = useCallback(
    () =>
      Promise.all([
        apiGet<{ usuarios: Usuario[] }>('/api/usuarios'),
        apiGet<{ sectors: Setor[] }>('/api/setores'),
      ])
        .then(([listaUsuarios, listaSetores]) => {
          setUsuarios(listaUsuarios.usuarios)
          setSetores(listaSetores.sectors)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void carregar()
  }, [carregar])

  function alternar<T>(lista: T[], valor: T): T[] {
    return lista.includes(valor) ? lista.filter((item) => item !== valor) : [...lista, valor]
  }

  function nomeDoSetor(id: string): string {
    return setores.find((setor) => setor.id === id)?.name ?? id
  }

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroForm(null)
    setSucesso(null)

    if (nome.trim() === '' || email.trim() === '' || senha === '') {
      setErroForm('Preencha nome, e-mail e senha.')
      return
    }

    setEnviando(true)
    try {
      await apiPost('/api/usuarios', { name: nome, email, senha, roles, sectorIds })
      setSucesso('Usuário criado.')
      setNome('')
      setEmail('')
      setSenha('')
      setRoles([])
      setSectorIds([])
      await carregar()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErroForm('E-mail já cadastrado. Use outro e-mail.')
      } else if (error instanceof ApiError && error.status === 403) {
        setErroForm('Sem permissão para gerenciar usuários.')
      } else {
        setErroForm('Não foi possível criar o usuário. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="p-2">
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar os usuários"
        action={
          <Button
            onClick={() => {
              setCarregando(true)
              void carregar()
            }}
          >
            Tentar de novo
          </Button>
        }
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  return (
    <section className="grid gap-4">
      <PageHead title="Usuários" description="Cadastre usuários e associe perfis e setores." />

      <Card>
        <CardHeader>
          <CardTitle>Novo usuário</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={aoEnviar} noValidate>
            {sucesso ? (
              <Alert variant="success" title={sucesso}>
                O usuário foi cadastrado.
              </Alert>
            ) : null}

            {erroForm ? (
              <Alert variant="error" title="Não foi possível criar o usuário">
                {erroForm}
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Nome" required>
                {(props) => (
                  <Input
                    {...props}
                    value={nome}
                    onChange={(evento) => setNome(evento.target.value)}
                  />
                )}
              </Field>

              <Field label="E-mail" required>
                {(props) => (
                  <Input
                    {...props}
                    type="email"
                    autoComplete="off"
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
                    autoComplete="new-password"
                    value={senha}
                    onChange={(evento) => setSenha(evento.target.value)}
                  />
                )}
              </Field>
            </div>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-ink">Perfis</legend>
              <div className="grid gap-2 sm:grid-cols-3">
                {TODOS_PERFIS.map((perfil) => (
                  <label key={perfil} className="flex items-center gap-2 text-sm text-ink">
                    <input
                      type="checkbox"
                      className="h-5 w-5"
                      checked={roles.includes(perfil)}
                      onChange={() => setRoles((atual) => alternar(atual, perfil))}
                    />
                    {ROTULO_PERFIL[perfil]}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-2">
              <legend className="text-sm font-semibold text-ink">Setores</legend>
              {setores.length === 0 ? (
                <p className="text-sm text-muted">Nenhum setor cadastrado.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-3">
                  {setores.map((setor) => (
                    <label key={setor.id} className="flex items-center gap-2 text-sm text-ink">
                      <input
                        type="checkbox"
                        className="h-5 w-5"
                        checked={sectorIds.includes(setor.id)}
                        onChange={() => setSectorIds((atual) => alternar(atual, setor.id))}
                      />
                      {setor.name}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <Button type="submit" disabled={enviando}>
              {enviando ? 'Criando…' : 'Criar usuário'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuários cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {usuarios.length === 0 ? (
            <p className="text-sm text-muted">Nenhum usuário cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table aria-label="Usuários" className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Usuário
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Perfil
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Setor
                    </th>
                    <th scope="col" className="px-3 py-3 font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((usuario) => (
                    <tr
                      key={usuario.id}
                      className="border-b border-line last:border-b-0 hover:bg-surface-2"
                    >
                      <td className="px-3 py-3">
                        <p className="font-semibold text-ink">{usuario.name}</p>
                        <p className="text-muted">{usuario.email}</p>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {usuario.roles.map((perfil) => (
                            <Badge key={perfil} variant="info">
                              {ROTULO_PERFIL[perfil]}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted">
                        Setores: {usuario.sectorIds.map(nomeDoSetor).join(', ')}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={usuario.status === 'ACTIVE' ? 'success' : 'neutral'}>
                          {usuario.status === 'ACTIVE' ? 'Ativo' : usuario.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
