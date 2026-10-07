'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { OcorrenciaForm } from '@/shared/ui/ocorrencia-form'
import { Spinner } from '@/shared/ui/spinner'

interface Ordem {
  atividadeId: string
  pedido: string
  item: string
  setor: string
  unidade: string
  solicitado: string | number
  executado: string | number
  pendente: string | number
}

export default function ExecutarAtividadePage() {
  const params = useParams<{ id: string }>()
  const atividadeId = params.id

  const [ordem, setOrdem] = useState<Ordem | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState(false)

  const [quantidade, setQuantidade] = useState('')
  const [erroQuantidade, setErroQuantidade] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const carregarOrdem = useCallback(
    (mostrarSpinner = true) =>
      apiGet<{ ordem: Ordem }>(`/api/producao/atividades/${atividadeId}/ordem`)
        .then((dados) => {
          setOrdem(dados.ordem)
          setErroCarga(false)
        })
        .catch(() => setErroCarga(true))
        .finally(() => {
          if (mostrarSpinner) setCarregando(false)
        }),
    [atividadeId],
  )

  useEffect(() => {
    void carregarOrdem()
  }, [carregarOrdem])

  function tentarDeNovo() {
    setCarregando(true)
    void carregarOrdem()
  }

  function validarQuantidade(valor: string): string | null {
    if (valor.trim() === '') return 'Informe a quantidade produzida.'
    const numero = Number(valor.replace(',', '.'))
    if (Number.isNaN(numero)) return 'Informe um número válido.'
    if (numero <= 0) return 'A quantidade deve ser maior que zero.'
    return null
  }

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setSucesso(null)
    setErroEnvio(null)

    const erro = validarQuantidade(quantidade)
    setErroQuantidade(erro)
    if (erro) return

    setEnviando(true)
    try {
      await apiPost(`/api/producao/atividades/${atividadeId}/execucoes`, { quantidade })
      setQuantidade('')
      setSucesso('Execução registrada.')
      await carregarOrdem(false)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setErroEnvio('Quantidade inválida. Verifique e tente novamente.')
      } else {
        setErroEnvio('Não foi possível registrar a execução. Tente novamente.')
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

  if (erroCarga || !ordem) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar a atividade"
        action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  return (
    <section className="grid gap-4">
      <div>
        <Link href="/operador/fila" className="text-sm font-medium text-accent">
          ← Voltar para a fila
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Executar atividade</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{ordem.item}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-1 text-sm text-muted">
          <p>Pedido {ordem.pedido} · Setor {ordem.setor}</p>
          <p>Solicitado: {ordem.solicitado} {ordem.unidade}</p>
          <p>Executado: {ordem.executado} {ordem.unidade}</p>
          <p className="font-semibold text-ink">
            Pendente: {ordem.pendente} {ordem.unidade}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar execução</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={aoEnviar} noValidate>
            {sucesso ? (
              <Alert variant="success" title={sucesso}>
                O saldo foi atualizado.
              </Alert>
            ) : null}

            {erroEnvio ? (
              <Alert variant="error" title="Não foi possível registrar">
                {erroEnvio}
              </Alert>
            ) : null}

            <Field label="Quantidade produzida" error={erroQuantidade ?? undefined} required>
              {(props) => (
                <Input
                  {...props}
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="any"
                  value={quantidade}
                  onChange={(evento) => setQuantidade(evento.target.value)}
                />
              )}
            </Field>

            <Button type="submit" disabled={enviando}>
              {enviando ? 'Registrando…' : 'Registrar execução'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Registrar ocorrência</CardTitle>
        </CardHeader>
        <CardContent>
          <OcorrenciaForm atividadeId={atividadeId} onRegistrada={() => void carregarOrdem(false)} />
        </CardContent>
      </Card>
    </section>
  )
}
