'use client'

import { useEffect, useRef, useState } from 'react'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
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
  events: JobEvent[]
}

const INTERVALO_POLL_MS = 1_500
/**
 * Limite técnico de acompanhamento automático na interface. Não é prazo de
 * negócio nem SLA: após esse tempo, o polling frequente é suspenso e o Vendedor
 * pode consultar o mesmo job manualmente.
 */
export const LIMITE_ACOMPANHAMENTO_PADRAO_MS = 60_000
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

function mensagemErroConsulta(error: unknown): string {
  if (error instanceof ApiError && error.status === 404) {
    return 'Job de importação não encontrado. A tentativa pode ter sido removida.'
  }
  return 'A importação pode continuar em andamento. Não foi possível consultar o status agora; tente novamente.'
}

export interface ImportarPedidoProps {
  /** Chamado quando a importação conclui com sucesso (ex.: recarregar a lista). */
  onConcluido?: (numero: string) => void
  titulo?: string
  descricao?: string
  /**
   * Limite técnico (ms) do acompanhamento automático. Padrão conservador de
   * 60s; não representa prazo de negócio nem SLA.
   */
  limiteAcompanhamentoMs?: number
}

/**
 * Importação de um pedido por número, com acompanhamento do status do job
 * (LAC-01, LAC-02, LAC-03). Reutilizado pelo Integrar e pela tela do vendedor,
 * que puxa o pedido do Top Gerente antes de desmembrá-lo.
 */
export function ImportarPedido({
  onConcluido,
  titulo,
  descricao,
  limiteAcompanhamentoMs = LIMITE_ACOMPANHAMENTO_PADRAO_MS,
}: ImportarPedidoProps) {
  const [numero, setNumero] = useState('')
  const [numeroDoJob, setNumeroDoJob] = useState<string | null>(null)
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [erroConsulta, setErroConsulta] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [importando, setImportando] = useState(false)
  const [consultandoManual, setConsultandoManual] = useState(false)
  const [esperaProlongada, setEsperaProlongada] = useState(false)
  const requisicaoRef = useRef(0)

  const final = status !== null && STATUS_FINAIS.includes(status)
  const limite =
    Number.isFinite(limiteAcompanhamentoMs) && limiteAcompanhamentoMs > 0
      ? Math.max(INTERVALO_POLL_MS, limiteAcompanhamentoMs)
      : LIMITE_ACOMPANHAMENTO_PADRAO_MS
  const maxConsultasAutomaticas = Math.max(1, Math.ceil(limite / INTERVALO_POLL_MS))

  // Invalida respostas pendentes ao desmontar (inclusive consulta manual).
  useEffect(
    () => () => {
      requisicaoRef.current += 1
    },
    [],
  )

  useEffect(() => {
    if (!jobId) return
    let cancelado = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let consultasAutomaticas = 0
    const sequencia = ++requisicaoRef.current

    async function consultar() {
      try {
        const dados = await apiGet<JobStatusResponse>(`/api/integracao/pedidos/${jobId}`)
        if (cancelado || sequencia !== requisicaoRef.current) return

        setStatus(dados.status)
        const falha = dados.events?.find((event) => event.type === 'FAILED')
        setErrorCode(falha?.detail ?? null)
        setErroConsulta(null)

        if (dados.status === 'SUCCEEDED') onConcluido?.(numeroDoJob ?? numero)
        if (STATUS_FINAIS.includes(dados.status)) {
          setEsperaProlongada(false)
          return
        }

        consultasAutomaticas += 1
        if (consultasAutomaticas >= maxConsultasAutomaticas) {
          setEsperaProlongada(true)
          return
        }
        timer = setTimeout(consultar, INTERVALO_POLL_MS)
      } catch (error) {
        if (cancelado || sequencia !== requisicaoRef.current) return
        setErroConsulta(mensagemErroConsulta(error))
      }
    }

    void consultar()

    return () => {
      cancelado = true
      if (timer) clearTimeout(timer)
    }
    // `numeroDoJob` é definido junto com `jobId`; reiniciar o efeito por ele
    // criaria um segundo ciclo de polling para a mesma tentativa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, maxConsultasAutomaticas])

  async function consultarAndamento() {
    const id = jobId
    if (!id || consultandoManual) return
    const sequencia = ++requisicaoRef.current
    setConsultandoManual(true)
    setErroConsulta(null)

    try {
      const dados = await apiGet<JobStatusResponse>(`/api/integracao/pedidos/${id}`)
      if (sequencia !== requisicaoRef.current) return

      setStatus(dados.status)
      const falha = dados.events?.find((event) => event.type === 'FAILED')
      setErrorCode(falha?.detail ?? null)

      if (dados.status === 'SUCCEEDED') onConcluido?.(numeroDoJob ?? numero)
      if (STATUS_FINAIS.includes(dados.status)) {
        setEsperaProlongada(false)
      } else {
        // A consulta manual não reativa o polling frequente.
        setEsperaProlongada(true)
      }
    } catch (error) {
      if (sequencia !== requisicaoRef.current) return
      setErroConsulta(mensagemErroConsulta(error))
    } finally {
      if (sequencia === requisicaoRef.current) setConsultandoManual(false)
    }
  }

  async function importar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    requisicaoRef.current += 1
    setErroValidacao(null)
    setErroEnvio(null)
    setErroConsulta(null)
    setJobId(null)
    setNumeroDoJob(null)
    setStatus(null)
    setErrorCode(null)
    setEsperaProlongada(false)
    setConsultandoManual(false)

    if (!numeroValido(numero)) {
      setErroValidacao('Informe um número de pedido válido (somente dígitos).')
      return
    }

    setImportando(true)
    try {
      const dados = await apiPost<{ jobId: string }>('/api/integracao/pedidos', {
        orderNumber: numero.trim(),
      })
      setNumeroDoJob(numero.trim())
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

  const numeroExibido = numeroDoJob ?? numero
  const mostrarConsultaManual = !final && (esperaProlongada || erroConsulta !== null)

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{titulo ?? 'Puxar pedido do Top Gerente'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={importar} noValidate>
            {erroEnvio ? (
              <Alert variant="error" title="Não foi possível iniciar a importação">
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
            {status ? (
              <Badge variant={VARIANTE_STATUS[status]}>{ROTULO_STATUS[status]}</Badge>
            ) : null}
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm text-muted">
              Pedido {numeroExibido} · Job {jobId}
            </p>

            {!final && !esperaProlongada && erroConsulta === null ? (
              <Spinner label="Atualizando status…" />
            ) : null}

            {esperaProlongada && erroConsulta === null ? (
              <Alert variant="warning" title="Acompanhamento automático pausado">
                A importação está demorando mais que o esperado. Consulte o andamento antes de
                tentar importar novamente.
              </Alert>
            ) : null}

            {erroConsulta ? (
              <Alert variant="error" title="Não foi possível consultar o andamento">
                {erroConsulta}
              </Alert>
            ) : null}

            {mostrarConsultaManual ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void consultarAndamento()}
                disabled={consultandoManual}
              >
                {consultandoManual ? 'Consultando…' : 'Consultar andamento'}
              </Button>
            ) : null}

            {status === 'SUCCEEDED' ? (
              <Alert variant="success" title="Importação concluída">
                O pedido foi importado com sucesso.
              </Alert>
            ) : null}

            {status === 'FAILED' ? (
              <Alert variant="error" title="Importação falhou">
                {errorCode
                  ? `Código do erro: ${errorCode}`
                  : 'O pedido não pôde ser importado. Tente novamente.'}
              </Alert>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
