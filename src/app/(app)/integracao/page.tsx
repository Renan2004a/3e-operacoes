'use client'

import { useEffect, useState } from 'react'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'

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

/** Importa um pedido por número e acompanha o status do job até concluir (LAC-01, LAC-02, LAC-03). */
export default function ImportarPedidoPage() {
  const [numero, setNumero] = useState('')
  const [erroValidacao, setErroValidacao] = useState<string | null>(null)
  const [erroEnvio, setErroEnvio] = useState<string | null>(null)
  const [jobId, setJobId] = useState<string | null>(null)
  const [status, setStatus] = useState<JobStatus | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
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
        const falha = dados.events?.find((event) => event.type === 'FAILED')
        setErrorCode(falha?.detail ?? null)
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
  }, [jobId])

  async function importar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErroValidacao(null)
    setErroEnvio(null)
    setJobId(null)
    setStatus(null)
    setErrorCode(null)

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

  return (
    <section className="grid gap-4">
      <PageHead
        title="Importar pedido"
        description="Informe o número do pedido para importar do Top Gerente."
      />

      <Card>
        <CardHeader>
          <CardTitle>Número do pedido</CardTitle>
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
              hint="Somente dígitos, como aparece no Top Gerente."
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
    </section>
  )
}
