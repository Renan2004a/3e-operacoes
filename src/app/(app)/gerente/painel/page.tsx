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

  return (
    <section className="grid gap-4">
      <PageHead title="Painel" description="Andamento da produção por setor e status." />

      <div className="grid gap-4 sm:grid-cols-2">
        <Metric
          label="Pendências"
          value={painel.pendencias}
          helper="Atividades não concluídas."
        />

        <Metric
          label="Cumprimento de prazo"
          value={`${cumprimentoPrazo.percentual}%`}
          helper={`${cumprimentoPrazo.concluidasNoPrazo} de ${cumprimentoPrazo.concluidasComPrazo} no prazo.`}
        />
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
                  {contagem.sectorId}: {contagem.total}
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

      <Card>
        <CardHeader>
          <CardTitle>Produção por setor</CardTitle>
        </CardHeader>
        <CardContent>
          {pcp.producaoPorSetor.length === 0 ? (
            <p className="text-sm text-muted">Sem produção registrada.</p>
          ) : (
            <ul aria-label="Produção por setor" className="grid gap-1">
              {pcp.producaoPorSetor.map((producao) => (
                <li key={producao.sectorId} className="text-sm text-ink">
                  {producao.sectorId}: {producao.quantidade}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
