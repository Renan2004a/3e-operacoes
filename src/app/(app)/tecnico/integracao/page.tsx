'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'

type JobStatus = 'PENDING' | 'DISPATCHED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'

interface Job {
  id: string
  legacyOrderNumber: string
  status: JobStatus
  attemptCount: number
  errorCode: string | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
  completedAt: string | null
}

interface JobEvent {
  id: string
  type: string
  detail: string | null
  createdAt: string
}

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

/**
 * Tela do Responsável Técnico (RF016/RF017): lista os jobs de integração com
 * status e erros e mostra os eventos do job selecionado (LAC-09, LAC-10).
 */
export default function IntegracaoTecnicoPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [eventos, setEventos] = useState<JobEvent[] | null>(null)
  const [carregandoEventos, setCarregandoEventos] = useState(false)
  const [erroEventos, setErroEventos] = useState(false)

  const buscarJobs = useCallback(
    () =>
      apiGet<{ jobs: Job[] }>('/api/integracao/jobs')
        .then((dados) => {
          setJobs(dados.jobs)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void buscarJobs()
  }, [buscarJobs])

  const selecionar = useCallback(async (jobId: string) => {
    setSelecionado(jobId)
    setEventos(null)
    setErroEventos(false)
    setCarregandoEventos(true)
    try {
      const dados = await apiGet<{ events: JobEvent[] }>(`/api/integracao/pedidos/${jobId}`)
      setEventos(dados.events ?? [])
    } catch {
      setErroEventos(true)
    } finally {
      setCarregandoEventos(false)
    }
  }, [])

  function tentarDeNovo() {
    setCarregando(true)
    void buscarJobs()
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
        title="Não foi possível carregar os jobs"
        action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  return (
    <section className="grid gap-4">
      <PageHead
        title="Integração"
        description="Jobs de integração com o Top Gerente e seus eventos."
      />

      {!jobs || jobs.length === 0 ? (
        <EmptyState
          title="Sem jobs de integração"
          description="Nenhuma importação foi solicitada ainda."
        />
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Jobs</CardTitle>
            </CardHeader>
            <CardContent>
              <ul aria-label="Jobs de integração" className="grid gap-2">
                {jobs.map((job) => {
                  const ativo = selecionado === job.id
                  return (
                    <li key={job.id}>
                      <button
                        type="button"
                        aria-pressed={ativo}
                        onClick={() => void selecionar(job.id)}
                        className={cn(
                          'flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-left',
                          ativo ? 'border-accent bg-surface-2' : 'border-line bg-surface',
                          FOCO_VISIVEL,
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block font-semibold text-ink">Pedido {job.legacyOrderNumber}</span>
                          <span className="block text-xs text-muted">Job {job.id}</span>
                          {job.errorCode ? (
                            <span className="block text-xs text-danger">
                              Erro: {job.errorCode}
                              {job.errorMessage ? ` — ${job.errorMessage}` : ''}
                            </span>
                          ) : null}
                        </span>
                        <Badge variant={VARIANTE_STATUS[job.status]}>
                          {ROTULO_STATUS[job.status]}
                        </Badge>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>

          {selecionado ? (
            <Card>
              <CardHeader>
                <CardTitle>Eventos do job</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                {carregandoEventos ? <Spinner label="Carregando eventos…" /> : null}

                {erroEventos ? (
                  <Alert variant="error" title="Não foi possível carregar os eventos">
                    Tente novamente.
                  </Alert>
                ) : null}

                {eventos && eventos.length === 0 ? (
                  <p className="text-sm text-muted">Este job não possui eventos.</p>
                ) : null}

                {eventos && eventos.length > 0 ? (
                  <ol aria-label="Eventos" className="grid gap-2">
                    {eventos.map((evento) => (
                      <li key={evento.id} className="rounded-lg border border-line p-3 text-sm">
                        <span className="font-semibold text-ink">{evento.type}</span>
                        {evento.detail ? (
                          <span className="text-muted"> — {evento.detail}</span>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </section>
  )
}
