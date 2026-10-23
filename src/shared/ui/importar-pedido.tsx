'use client'

import { useEffect, useState } from 'react'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import {
  codigoFalhaAtual,
  mensagemFalhaImportacao,
  mensagemSucessoImportacao,
  sucessoFoiReimportacao,
} from '@/modules/integracao/mensagens-importacao'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Field } from './field'
import { Input } from './input'
import { Spinner } from './spinner'

type JobStatus = 'PENDING' | 'DISPATCHED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

interface JobEvent {
  type: string
  detail: string | null
}

interface JobStatusResponse {
  jobId: string
  status: JobStatus
  /** Código da falha da tentativa atual (não o histórico de tentativas antigas). */
  errorCode?: string | null
  events: JobEvent[]
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
  titulo?: string
  descricao?: string
}

/**
 * Importação de um pedido por número, com acompanhamento do status do job
 * (LAC-01, LAC-02, LAC-03). Reutilizado pelo Integrar e pela tela do vendedor,
 * que puxa o pedido do Top Gerente antes de desmembrá-lo.
 */
export function ImportarPedido({ onConcluido, titulo, descricao }: ImportarPedidoProps) {
  const [numero, setNumero] = useState('')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [reimportado, setReimportado] = useState(false)
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
        setStatus(dados.status)
        setErrorCode(codigoFalhaAtual(dados.status, dados.errorCode, dados.events))
        setReimportado(sucessoFoiReimportacao(dados.status, dados.events))
        if (dados.status === 'SUCCEEDED') onConcluido?.(numero)
        if (!STATUS_FINAIS.includes(dados.status)) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId])

  async function executarImportacao() {
    setErroValidacao(null)
    setErroEnvio(null)
    setJobId(null)
    setStatus(null)
    setErrorCode(null)
    setReimportado(false)

    if (!numeroValido(numero)) {
      setErroValidacao('Informe um número de pedido válido (somente dígitos).')
      return
    }

    setImportando(true)
    try {
      const dados = await apiPost<{ jobId: string }>('/api/integracao/pedidos', {
        orderNumber: numero.trim(),
      })
      setJobId(dados.jobId)
      setStatus('PENDING')
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

  async function importar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    await executarImportacao()
  }

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
              hint={
                descricao ??
                'Informe o número do pedido no Top Gerente. Ele pode ser diferente do número exibido no 3E.'
              }
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

            {status === 'SUCCEEDED'
              ? (() => {
                  const sucesso = mensagemSucessoImportacao(reimportado)
                  return (
                    <Alert variant="success" title={sucesso.titulo}>
                      <p>{sucesso.mensagem}</p>
                    </Alert>
                  )
                })()
              : null}

            {status === 'FAILED'
              ? (() => {
                  const falha = mensagemFalhaImportacao(errorCode)
                  return (
                    <Alert
                      variant="error"
                      title={falha.titulo}
                      action={
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={importando}
                          onClick={() => void executarImportacao()}
                        >
                          {importando ? 'Tentando…' : 'Tentar novamente'}
                        </Button>
                      }
                    >
                      <p>{falha.mensagem}</p>
                      {errorCode ? (
                        <p className="mt-2 text-xs opacity-80">
                          Código técnico: {errorCode}
                          {jobId ? ` — Job: ${jobId}` : ''}. Informe este código ao responsável
                          pelo sistema.
                        </p>
                      ) : null}
                    </Alert>
                  )
                })()
              : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
