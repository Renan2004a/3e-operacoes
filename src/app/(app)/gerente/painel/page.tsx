'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ActivityStatus } from '@/modules/producao/tipos'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Metric } from '@/shared/ui/metric'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'

interface ContagemPorSetor {
  sectorId: string
  total: number
  sectorName?: string | null
}

interface ContagemPorStatus {
  status: ActivityStatus
  total: number
}

interface Painel {
  porSetor: ContagemPorSetor[]
  porStatus: ContagemPorStatus[]
  pendencias: number
}

interface ProducaoPorSetor {
  sectorId: string
  quantidade: string | number
  sectorName?: string | null
}

interface CumprimentoPrazo {
  concluidasComPrazo: number
  concluidasNoPrazo: number
  percentual: number
}

interface Pcp {
  producaoPorSetor: ProducaoPorSetor[]
  cumprimentoPrazo: CumprimentoPrazo
}

interface Indicadores {
  painel: Painel
  pcp: Pcp
}

const ROTULO_STATUS: Record<ActivityStatus, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  DIVERGENT: 'Divergente',
}

const VARIANTE_STATUS: Record<ActivityStatus, 'neutral' | 'info' | 'warning' | 'success' | 'danger'> =
  {
    PENDING: 'neutral',
    IN_PROGRESS: 'info',
    PAUSED: 'warning',
    COMPLETED: 'success',
    DIVERGENT: 'danger',
  }

/** Painel do gerente: contagens por setor/status, pendências e indicadores de PCP (FEP-01, FEP-02). */
export default function PainelPage() {
  const [dados, setDados] = useState<Indicadores | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const buscar = useCallback(
    () =>
      apiGet<Indicadores>('/api/indicadores')
        .then((resposta) => {
          setDados(resposta)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void buscar()
  }, [buscar])

  function tentarDeNovo() {
    setCarregando(true)
    void buscar()
  }

  if (carregando) {
    return (
      <div className="p-2">
        <Spinner />
      </div>
    )
  }

  if (erro || !dados) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar o painel"
        action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  const { painel, pcp } = dados
  const { cumprimentoPrazo } = pcp

  const totalPorStatus = (status: ActivityStatus) =>
    painel.porStatus.find((contagem) => contagem.status === status)?.total ?? 0
  const maxProducao = Math.max(...pcp.producaoPorSetor.map((linha) => Number(linha.quantidade)), 0)
  const percentualProducao = (quantidade: string | number) =>
    maxProducao > 0 ? Math.min(100, Math.round((Number(quantidade) / maxProducao) * 100)) : 0

  return (
    <section className="grid gap-4">
      <PageHead title="Painel" description="Andamento da produção por setor e status." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Pendências"
          value={painel.pendencias}
          helper="Atividades não concluídas."
        />

        <Metric
          label="Em andamento"
          value={totalPorStatus('IN_PROGRESS')}
          tone="info"
          helper="Em execução."
        />

        <Metric
          label="Concluídas"
          value={totalPorStatus('COMPLETED')}
          tone="success"
          helper="Finalizadas."
        />

        <Metric
          label="Cumprimento de prazo"
          value={`${cumprimentoPrazo.percentual}%`}
          tone="success"
          helper={`${cumprimentoPrazo.concluidasNoPrazo} de ${cumprimentoPrazo.concluidasComPrazo} no prazo.`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Produção por setor</CardTitle>
          </CardHeader>
          <CardContent>
            {pcp.producaoPorSetor.length === 0 ? (
              <p className="text-sm text-muted">Sem produção registrada.</p>
            ) : (
              <ul aria-label="Produção por setor" className="grid gap-3">
                {pcp.producaoPorSetor.map((producao) => (
                  <li key={producao.sectorId} className="grid gap-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-ink">{producao.sectorName ?? producao.sectorId}</span>
                      <span className="font-semibold text-ink">{producao.quantidade}</span>
                    </div>
                    <progress
                      className="h-3 w-full"
                      aria-label={`Produção do setor ${producao.sectorName ?? producao.sectorId}`}
                      value={percentualProducao(producao.quantidade)}
                      max={100}
                    />
                    <span className="text-xs text-muted">
                      {producao.sectorName ?? producao.sectorId}: {producao.quantidade}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atividades por status</CardTitle>
          </CardHeader>
          <CardContent>
            {painel.porStatus.length === 0 ? (
              <p className="text-sm text-muted">Sem atividades por status.</p>
            ) : (
              <ul aria-label="Atividades por status" className="grid gap-2">
                {painel.porStatus.map((contagem) => (
                  <li
                    key={contagem.status}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <Badge variant={VARIANTE_STATUS[contagem.status]}>
                      {ROTULO_STATUS[contagem.status]}
                    </Badge>
                    <span className="text-ink">Total: {contagem.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Atividades por setor</CardTitle>
        </CardHeader>
        <CardContent>
          {painel.porSetor.length === 0 ? (
            <p className="text-sm text-muted">Sem atividades por setor.</p>
          ) : (
            <ul aria-label="Atividades por setor" className="grid gap-1">
              {painel.porSetor.map((contagem) => (
                <li key={contagem.sectorId} className="text-sm text-ink">
                  {contagem.sectorName ?? contagem.sectorId}: {contagem.total}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
