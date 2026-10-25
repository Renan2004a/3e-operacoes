'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import type { OrigemSolicitacao } from '@/modules/integracao/resultado-solicitacao'
import {
  codigoDaFalha,
  divergenciasUnidadeDosEventos,
  mensagemDoResultado,
  mensagemEmAndamento,
  sucessoFoiReimportacao,
  temEventoNovo,
  type DivergenciaUnidadeEvento,
  type EventoImportacao,
} from '@/modules/integracao/transparencia-importacao'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Field } from './field'
import { Input } from './input'
import { Spinner } from './spinner'
import { cn, FOCO_VISIVEL } from './utils'

type JobStatus = 'PENDING' | 'DISPATCHED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

interface JobStatusResponse {
  jobId: string
  orderId: string | null
  status: JobStatus
  events: EventoImportacao[]
}

interface IniciarImportacaoResponse {
  jobId: string
  orderId: string | null
  status: JobStatus
  origem: OrigemSolicitacao
  solicitadoEm: string
}

const INTERVALO_POLL_MS = 1_500
const STATUS_FINAIS: readonly JobStatus[] = ['SUCCEEDED', 'FAILED']

const ROTULO_STATUS: Record<JobStatus, string> = {
  PENDING: 'Pendente',
  DISPATCHED: 'Despachado',
  RUNNING: 'Processando',
  SUCCEEDED: 'Concluído',
  FAILED: 'Falhou',
}

const VARIANTE_STATUS: Record<JobStatus, 'neutral' | 'info' | 'success' | 'danger'> = {
  PENDING: 'neutral',
  DISPATCHED: 'info',
  RUNNING: 'info',
  SUCCEEDED: 'success',
  FAILED: 'danger',
}

/** Aceita apenas inteiro positivo, como o servidor (LAC-02). */
function numeroValido(valor: string): boolean {
  const limpo = valor.trim()
  if (!/^\d+$/.test(limpo)) return false
  const numero = Number(limpo)
  return Number.isSafeInteger(numero) && numero > 0
}

export interface ImportarPedidoProps {
  /** Chamado quando a importação conclui com sucesso (ex.: recarregar a lista). */
  onConcluido?: (numero: string) => void
  /** Rota do detalhe do pedido; habilita o link "Abrir pedido" no perfil. */
  hrefPedido?: (orderId: string) => string
  titulo?: string
  descricao?: string
}

/**
 * Importação de um pedido por número, com acompanhamento do status do job
 * (LAC-01, LAC-02, LAC-03). Reutilizado pelo Integrar e pela tela do vendedor,
 * que puxa o pedido do Top Gerente antes de desmembrá-lo.
 */
export function ImportarPedido({
  onConcluido,
  hrefPedido,
  titulo,
  descricao,
}: ImportarPedidoProps) {
  const [numero, setNumero] = useState('')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [origem, setOrigem] = useState<OrigemSolicitacao | null>(null)
  const [solicitadoEm, setSolicitadoEm] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [reimportado, setReimportado] = useState(false)
  const [divergenciasUnidade, setDivergenciasUnidade] = useState<DivergenciaUnidadeEvento[]>([])
  const [importando, setImportando] = useState(false)

  const final = status !== null && STATUS_FINAIS.includes(status)

  useEffect(() => {
    if (!jobId) return
    let cancelado = false
    let timer: ReturnType<typeof setTimeout> | undefined

    async function consultar() {
      try {
        const dados = await apiGet<JobStatusResponse>(`/api/integracao/pedidos/${jobId}`)
        if (cancelado) return

        const eventos = dados.events ?? []
        // Em uma consulta nova, um job antigo pode ainda exibir o resultado
        // anterior até o despacho começar. Só aceita o estado final quando há
        // evento novo da tentativa atual.
        const aguardandoNovaConsulta =
          origem === 'NOVA' &&
          STATUS_FINAIS.includes(dados.status) &&
          !temEventoNovo(eventos, dados.status, solicitadoEm)
        const statusEfetivo = aguardandoNovaConsulta ? 'PENDING' : dados.status
        const finalEfetivo = STATUS_FINAIS.includes(statusEfetivo)

        const desdeTentativa = origem === 'NOVA' ? solicitadoEm : null
        setStatus(statusEfetivo)
        setOrderId(dados.orderId ?? null)
        setReimportado(
          finalEfetivo && sucessoFoiReimportacao(eventos, desdeTentativa),
        )
        setErrorCode(
          statusEfetivo === 'FAILED' ? codigoDaFalha(eventos, desdeTentativa) : null,
        )
        setDivergenciasUnidade(
          finalEfetivo ? divergenciasUnidadeDosEventos(eventos, desdeTentativa) : [],
        )

        if (statusEfetivo === 'SUCCEEDED') onConcluido?.(numero)
        if (!finalEfetivo) {
          timer = setTimeout(consultar, INTERVALO_POLL_MS)
        }
      } catch (error) {
        if (cancelado) return
        if (error instanceof ApiError && error.status === 404) {
          setErroEnvio('Job de importação não encontrado.')
        } else {
          setErroEnvio('Não foi possível consultar o status. Tente novamente.')
        }
      }
    }

    void consultar()
    return () => {
      cancelado = true
      if (timer) clearTimeout(timer)
    }
    // Origem e instante mudam mesmo quando o jobId é reaproveitado; o efeito
    // precisa reiniciar para não continuar com a classificação anterior.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, origem, solicitadoEm])

  async function importar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroValidacao(null)
    setErroEnvio(null)
    setJobId(null)
    setOrderId(null)
    setStatus(null)
    setOrigem(null)
    setSolicitadoEm(null)
    setErrorCode(null)
    setReimportado(false)
    setDivergenciasUnidade([])

    if (!numeroValido(numero)) {
      setErroValidacao('Informe um número de pedido válido (somente dígitos).')
      return
    }

    setImportando(true)
    try {
      const dados = await apiPost<IniciarImportacaoResponse>('/api/integracao/pedidos', {
        orderNumber: numero.trim(),
      })
      setJobId(dados.jobId)
      setOrderId(dados.orderId)
      setStatus(dados.status)
      setOrigem(dados.origem)
      setSolicitadoEm(dados.solicitadoEm)
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setErroEnvio('Número de pedido inválido. Confira e tente novamente.')
      } else {
        setErroEnvio('Não foi possível iniciar a importação. Tente novamente.')
      }
    } finally {
      setImportando(false)
    }
  }

  const resultado =
    final && origem
      ? mensagemDoResultado({
          origem,
          status: status as 'SUCCEEDED' | 'FAILED',
          reimportado,
        })
      : null
  const andamento = !final && origem ? mensagemEmAndamento(origem) : null
  const pedidoHref =
    status === 'SUCCEEDED' && orderId && hrefPedido ? hrefPedido(orderId) : null

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{titulo ?? 'Puxar pedido do Top Gerente'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={importar} noValidate>
            {erroEnvio ? (
              <Alert variant="error" title="Falha na importação">
                {erroEnvio}
              </Alert>
            ) : null}

            <Field
              label="Número do pedido"
              hint={descricao ?? 'Somente dígitos, como aparece no Top Gerente.'}
              error={erroValidacao ?? undefined}
              required
            >
              {(props) => (
                <Input
                  {...props}
                  inputMode="numeric"
                  autoComplete="off"
                  value={numero}
                  onChange={(evento) => setNumero(evento.target.value)}
                />
              )}
            </Field>

            <Button type="submit" disabled={importando}>
              {importando ? 'Importando…' : 'Importar pedido'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {jobId ? (
        <Card>
          <CardHeader>
            <CardTitle>Status da importação</CardTitle>
            {status ? <Badge variant={VARIANTE_STATUS[status]}>{ROTULO_STATUS[status]}</Badge> : null}
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted">Job {jobId}</p>

            {!final ? <Spinner label="Atualizando status…" /> : null}

            {andamento ? (
              <Alert variant="info" title={andamento.titulo}>
                {andamento.mensagem}
              </Alert>
            ) : null}

            {resultado && status === 'SUCCEEDED' ? (
              <Alert variant="success" title={resultado.titulo}>
                {resultado.mensagem}
              </Alert>
            ) : null}

            {resultado && status === 'FAILED' ? (
              <Alert variant="error" title={resultado.titulo}>
                <p>{resultado.mensagem}</p>
                {errorCode ? (
                  <p className="mt-2 text-xs opacity-80">Código técnico: {errorCode}</p>
                ) : null}
              </Alert>
            ) : null}

            {divergenciasUnidade.length > 0 ? (
              <Alert variant="warning" title="Unidade preservada">
                <p>
                  O Top Gerente enviou uma unidade diferente para item(ns) com histórico
                  operacional. A unidade anterior foi mantida e nenhuma conversão foi feita.
                </p>
                <ul className="mt-2 grid gap-1">
                  {divergenciasUnidade.map((divergencia) => (
                    <li key={divergencia.legacyItemKey}>
                      {divergencia.description ?? `Item ${divergencia.legacyItemKey}`}:{' '}
                      <strong>{divergencia.unidadeAnterior}</strong> →{' '}
                      <strong>{divergencia.unidadeNova}</strong>
                    </li>
                  ))}
                </ul>
              </Alert>
            ) : null}

            {pedidoHref ? (
              <Link
                href={pedidoHref}
                className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}
              >
                Abrir pedido
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
