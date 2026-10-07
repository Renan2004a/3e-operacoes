'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet, apiPatch, apiPost } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'

interface Setor {
  id: string
  code: string
  name: string
  active: boolean
}

interface Mapeamento {
  id: string
  legacyCategory: string
  sectorId: string
  status: string
}

const CLASSE_SELECT =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink'

/** Administração de setores e mapeamentos categoria → setor (FEP-09). */
export default function SetoresPage() {
  const [setores, setSetores] = useState<Setor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const [codigo, setCodigo] = useState('')
  const [nomeSetor, setNomeSetor] = useState('')
  const [erroSetor, setErroSetor] = useState<string | null>(null)
  const [sucessoSetor, setSucessoSetor] = useState<string | null>(null)
  const [criandoSetor, setCriandoSetor] = useState(false)

  const [categoria, setCategoria] = useState('')
  const [buscou, setBuscou] = useState(false)
  const [mapeamento, setMapeamento] = useState<Mapeamento | null>(null)
  const [setorMapeamento, setSetorMapeamento] = useState('')
  const [erroMapeamento, setErroMapeamento] = useState<string | null>(null)
  const [sucessoMapeamento, setSucessoMapeamento] = useState<string | null>(null)
  const [salvandoMapeamento, setSalvandoMapeamento] = useState(false)

  const carregarSetores = useCallback(
    () =>
      apiGet<{ sectors: Setor[] }>('/api/setores')
        .then((dados) => {
          setSetores(dados.sectors)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void carregarSetores()
  }, [carregarSetores])

  function nomeDoSetor(id: string): string {
    return setores.find((setor) => setor.id === id)?.name ?? id
  }

  async function criarSetor(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroSetor(null)
    setSucessoSetor(null)
    if (codigo.trim() === '' || nomeSetor.trim() === '') {
      setErroSetor('Preencha código e nome do setor.')
      return
    }

    setCriandoSetor(true)
    try {
      await apiPost('/api/setores', { code: codigo, name: nomeSetor })
      setSucessoSetor('Setor criado.')
      setCodigo('')
      setNomeSetor('')
      await carregarSetores()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErroSetor('Setor já existe com este código.')
      } else {
        setErroSetor('Não foi possível criar o setor. Tente novamente.')
      }
    } finally {
      setCriandoSetor(false)
    }
  }

  async function buscarMapeamento() {
    setErroMapeamento(null)
    setSucessoMapeamento(null)
    setBuscou(false)

    try {
      const dados = await apiGet<{ mapping: Mapeamento }>(
        `/api/mapeamentos?category=${encodeURIComponent(categoria)}`,
      )
      setMapeamento(dados.mapping)
      setSetorMapeamento(dados.mapping.sectorId)
      setBuscou(true)
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setMapeamento(null)
        setSetorMapeamento('')
        setBuscou(true)
      } else {
        setErroMapeamento('Não foi possível buscar o mapeamento. Tente novamente.')
      }
    }
  }

  async function salvarMapeamento(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroMapeamento(null)
    setSucessoMapeamento(null)

    if (categoria.trim() === '' || setorMapeamento === '') {
      setErroMapeamento('Informe a categoria e o setor.')
      return
    }

    setSalvandoMapeamento(true)
    try {
      if (mapeamento) {
        await apiPatch('/api/mapeamentos', { id: mapeamento.id, sectorId: setorMapeamento })
      } else {
        await apiPost('/api/mapeamentos', {
          legacyCategory: categoria,
          sectorId: setorMapeamento,
        })
      }
      setSucessoMapeamento('Mapeamento salvo.')
      await buscarMapeamento()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErroMapeamento('Esta categoria já possui um mapeamento ativo.')
      } else {
        setErroMapeamento('Não foi possível salvar o mapeamento. Tente novamente.')
      }
    } finally {
      setSalvandoMapeamento(false)
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
        title="Não foi possível carregar os setores"
        action={
          <Button
            onClick={() => {
              setCarregando(true)
              void carregarSetores()
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
      <PageHead
        title="Setores e mapeamentos"
        description="Mantenha setores e o mapeamento de categoria para setor."
      />

      <Card>
        <CardHeader>
          <CardTitle>Novo setor</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={criarSetor} noValidate>
            {sucessoSetor ? (
              <Alert variant="success" title={sucessoSetor}>
                O setor foi cadastrado.
              </Alert>
            ) : null}

            {erroSetor ? (
              <Alert variant="error" title="Não foi possível criar o setor">
                {erroSetor}
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Código" required>
                {(props) => (
                  <Input
                    {...props}
                    value={codigo}
                    onChange={(evento) => setCodigo(evento.target.value)}
                  />
                )}
              </Field>
              <Field label="Nome do setor" required>
                {(props) => (
                  <Input
                    {...props}
                    value={nomeSetor}
                    onChange={(evento) => setNomeSetor(evento.target.value)}
                  />
                )}
              </Field>
            </div>

            <Button type="submit" disabled={criandoSetor}>
              {criandoSetor ? 'Criando…' : 'Criar setor'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={salvarMapeamento} noValidate>
            {sucessoMapeamento ? (
              <Alert variant="success" title={sucessoMapeamento}>
                O mapeamento foi salvo.
              </Alert>
            ) : null}

            {erroMapeamento ? (
              <Alert variant="error" title="Não foi possível salvar o mapeamento">
                {erroMapeamento}
              </Alert>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <Field label="Categoria" required>
                {(props) => (
                  <Input
                    {...props}
                    value={categoria}
                    onChange={(evento) => {
                      setCategoria(evento.target.value)
                      setBuscou(false)
                    }}
                  />
                )}
              </Field>
              <Button onClick={buscarMapeamento} variant="secondary">
                Buscar mapeamento
              </Button>
            </div>

            {buscou ? (
              <div className="grid gap-4">
                <p className="text-sm text-ink">
                  {mapeamento
                    ? `Mapeado para ${nomeDoSetor(mapeamento.sectorId)}.`
                    : 'Sem mapeamento para esta categoria.'}
                </p>

                <Field label="Setor" required>
                  {(props) => (
                    <select
                      id={props.id}
                      aria-describedby={props['aria-describedby']}
                      className={CLASSE_SELECT}
                      value={setorMapeamento}
                      onChange={(evento) => setSetorMapeamento(evento.target.value)}
                    >
                      <option value="">Selecione…</option>
                      {setores.map((setor) => (
                        <option key={setor.id} value={setor.id}>
                          {setor.name}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>

                <Button type="submit" disabled={salvandoMapeamento}>
                  {salvandoMapeamento ? 'Salvando…' : 'Salvar mapeamento'}
                </Button>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Setores cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {setores.length === 0 ? (
            <p className="text-sm text-muted">Nenhum setor cadastrado.</p>
          ) : (
            <ul aria-label="Setores" className="grid gap-2">
              {setores.map((setor) => (
                <li key={setor.id} className="text-sm text-ink">
                  {setor.code}: {setor.name}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
