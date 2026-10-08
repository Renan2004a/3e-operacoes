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
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'

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

/** Percentual executado do item, limitado a 100 (PROT-05). */
function percentualExecutado(ordem: Ordem): number {
  const solicitado = Number(ordem.solicitado)
  const executado = Number(ordem.executado)
  if (!Number.isFinite(solicitado) || solicitado <= 0) return 0
  return Math.min(100, Math.round((executado / solicitado) * 100))
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
      <div className="grid gap-2">
        <Link
          href="/operador/fila"
          className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}
        >
          ← Voltar para a fila
        </Link>
        <PageHead title="Executar atividade" />
        <Link
          href={`/producao/atividades/${atividadeId}/ordem`}
          className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}
        >
          Ver ordem de produção
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{ordem.item}</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Pedido {ordem.pedido} · Setor {ordem.setor}
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Executado</span>
              <span className="font-semibold text-ink">
                {ordem.executado} de {ordem.solicitado} {ordem.unidade}
              </span>
            </div>
            <progress
              className="h-3 w-full"
              aria-label="Progresso da atividade"
              value={percentualExecutado(ordem)}
              max={100}
            />
          </div>
          <ul aria-label="Valores da atividade" className="grid gap-1 text-sm text-muted">
            <li>
              Solicitado: {ordem.solicitado} {ordem.unidade}
            </li>
            <li>
              Executado: {ordem.executado} {ordem.unidade}
            </li>
            <li className="font-semibold text-ink">
              Pendente: {ordem.pendente} {ordem.unidade}
            </li>
          </ul>
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
