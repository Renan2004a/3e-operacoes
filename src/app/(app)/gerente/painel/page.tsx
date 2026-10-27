'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { ActivityStatus } from '@/modules/producao/tipos'
import type { TipoOcorrencia } from '@/modules/ocorrencias/motivos'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Metric } from '@/shared/ui/metric'
import { PageHead } from '@/shared/ui/page-head'
import { Progress } from '@/shared/ui/progress'
import { Spinner } from '@/shared/ui/spinner'
import { rotuloDaUnidade } from '@/shared/ui/totais-unidade'

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
  unidade: string | null
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

interface Alerta {
  tipo: 'ATRASADO' | 'PARADO' | 'NAO_ENCAMINHADO'
  orderId: string
  orderNumber: string
  itemId: string
  itemDescription: string | null
  sectorName: string | null
  detail: string
}

interface Alertas {
  atrasados: Alerta[]
  parados: Alerta[]
  naoEncaminhados: Alerta[]
}

interface OcorrenciaDetalhada {
  id: string
  tipo: TipoOcorrencia
  quantidade: string | number | null
  observacao: string | null
  occurredAt: string
  motivo: string | null
  pedido: string
  item: string | null
  setor: string | null
  usuario: string | null
}

interface ResumoOcorrencias {
  total: number
  ultimos7Dias: number
  porTipo: { tipo: TipoOcorrencia; total: number }[]
  recentes: OcorrenciaDetalhada[]
}

const ROTULO_TIPO: Record<TipoOcorrencia, string> = {
  PERDA: 'Perda',
  REFUGO: 'Refugo',
  INDISPONIBILIDADE: 'Indisponibilidade',
  PAUSA: 'Pausa',
  PARADA: 'Parada',
  DEFEITO: 'Defeito',
}

const VARIANTE_TIPO: Record<
  TipoOcorrencia,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  PERDA: 'danger',
  REFUGO: 'warning',
  INDISPONIBILIDADE: 'warning',
  PAUSA: 'info',
  PARADA: 'danger',
  DEFEITO: 'warning',
}

function formatarDataHora(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

/** Horário da última atualização, no fuso do projeto (AD-009). */
function formatarHora(data: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    timeStyle: 'short',
  }).format(data)
}

type TomAlerta = 'danger' | 'warning' | 'info'

function GrupoAlertas({
  titulo,
  tom,
  itens,
}: {
  titulo: string
  tom: TomAlerta
  itens: Alerta[]
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{titulo}</span>
        <Badge variant={tom}>{itens.length}</Badge>
      </div>
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nada por aqui.</p>
      ) : (
        <ul className="grid gap-2">
          {itens.slice(0, 6).map((alerta) => (
            <li
              key={`${alerta.tipo}-${alerta.itemId}`}
              className="rounded-lg border border-line p-2 text-sm"
            >
              <Link href={`/gerente/pedidos/${alerta.orderId}`} className="font-medium text-accent">
                Pedido {alerta.orderNumber}
              </Link>
              <p className="text-ink">
                {alerta.itemDescription ?? 'Item'} · {alerta.sectorName ?? 'Sem setor'}
              </p>
              <p className="text-xs text-muted">{alerta.detail}</p>
            </li>
          ))}
          {itens.length > 6 ? (
            <li className="text-xs text-muted">+{itens.length - 6} outros…</li>
          ) : null}
        </ul>
      )}
    </div>
  )
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
  const [alertas, setAlertas] = useState<Alertas | null>(null)
  const [ocorrencias, setOcorrencias] = useState<ResumoOcorrencias | null>(null)
  const [erroIndicadores, setErroIndicadores] = useState(false)
  const [erroAlertas, setErroAlertas] = useState(false)
  const [erroOcorrencias, setErroOcorrencias] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [atualizando, setAtualizando] = useState(false)
  const [atualizadoEm, setAtualizadoEm] = useState<Date | null>(null)

  const buscar = useCallback(
    () =>
      // Cada bloco carrega de forma independente: a falha de um não derruba os
      // demais (P08 da avaliação do Gerente).
      Promise.allSettled([
        apiGet<Indicadores>('/api/indicadores'),
        apiGet<{ alertas: Alertas }>('/api/indicadores/alertas'),
        apiGet<{ resumo: ResumoOcorrencias }>('/api/indicadores/ocorrencias'),
      ]).then(([resposta, respostaAlertas, respostaOcorrencias]) => {
        if (resposta.status === 'fulfilled') {
          setDados(resposta.value)
          setErroIndicadores(false)
        } else {
          setErroIndicadores(true)
        }
        if (respostaAlertas.status === 'fulfilled') {
          setAlertas(respostaAlertas.value.alertas)
          setErroAlertas(false)
        } else {
          setErroAlertas(true)
        }
        if (respostaOcorrencias.status === 'fulfilled') {
          setOcorrencias(respostaOcorrencias.value.resumo)
          setErroOcorrencias(false)
        } else {
          setErroOcorrencias(true)
        }

        setAtualizadoEm(new Date())
        setCarregando(false)
      }),
    [],
  )

  useEffect(() => {
    void buscar()
  }, [buscar])

  function tentarDeNovo() {
    setCarregando(true)
    void buscar()
  }

  async function atualizar() {
    setAtualizando(true)
    await buscar()
    setAtualizando(false)
  }

  if (carregando) {
    return (
      <div className="p-2">
        <Spinner />
      </div>
    )
  }

  if (!dados) {
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
  // Sem atividades concluídas com prazo não há percentual: "0%" induziria a
  // leitura de péssimo desempenho (P04 da avaliação do Gerente).
  const temCumprimentoDePrazo = cumprimentoPrazo.concluidasComPrazo > 0

  const totalPorStatus = (status: ActivityStatus) =>
    painel.porStatus.find((contagem) => contagem.status === status)?.total ?? 0
  /** Maior produção entre as linhas da mesma unidade: só se compara o que tem a mesma medida (RN01). */
  const maxProducaoDaUnidade = (unidade: string | null) =>
    Math.max(
      ...pcp.producaoPorSetor
        .filter((linha) => linha.unidade === unidade)
        .map((linha) => Number(linha.quantidade)),
      0,
    )
  const percentualProducao = (linha: ProducaoPorSetor) => {
    const maximo = maxProducaoDaUnidade(linha.unidade)
    return maximo > 0 ? Math.min(100, Math.round((Number(linha.quantidade) / maximo) * 100)) : 0
  }

  return (
    <section className="grid gap-4">
      <PageHead
        title="Painel"
        description="Andamento da produção por setor e status."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {atualizadoEm ? (
              <span className="text-sm text-muted">Atualizado às {formatarHora(atualizadoEm)}</span>
            ) : null}
            <Button variant="outline" onClick={() => void atualizar()} disabled={atualizando}>
              {atualizando ? 'Atualizando…' : 'Atualizar'}
            </Button>
          </div>
        }
      />

      {erroIndicadores ? (
        <Alert
          variant="warning"
          title="Não foi possível atualizar os indicadores"
          action={<Button onClick={() => void atualizar()}>Tentar de novo</Button>}
        >
          Os números abaixo são da última atualização.
        </Alert>
      ) : null}

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
          value={temCumprimentoDePrazo ? `${Math.round(cumprimentoPrazo.percentual)}%` : '—'}
          tone={temCumprimentoDePrazo ? 'success' : 'default'}
          helper={
            temCumprimentoDePrazo
              ? `${cumprimentoPrazo.concluidasNoPrazo} de ${cumprimentoPrazo.concluidasComPrazo} no prazo.`
              : 'Sem concluídas com prazo.'
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alertas operacionais</CardTitle>
        </CardHeader>
        <CardContent>
          {erroAlertas ? (
            <Alert
              variant="error"
              title="Não foi possível carregar os alertas"
              action={<Button onClick={() => void atualizar()}>Tentar de novo</Button>}
            >
              Verifique sua conexão e tente novamente.
            </Alert>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3">
              <GrupoAlertas titulo="Atrasados" tom="danger" itens={alertas?.atrasados ?? []} />
              <GrupoAlertas titulo="Parados" tom="warning" itens={alertas?.parados ?? []} />
              <GrupoAlertas
                titulo="Não encaminhados"
                tom="info"
                itens={alertas?.naoEncaminhados ?? []}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Ocorrências recentes</CardTitle>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{ocorrencias?.total ?? 0} no total</Badge>
              <Badge variant="warning">
                {ocorrencias?.ultimos7Dias ?? 0} nos últimos 7 dias
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {erroOcorrencias ? (
            <Alert
              variant="error"
              title="Não foi possível carregar as ocorrências"
              action={<Button onClick={() => void atualizar()}>Tentar de novo</Button>}
            >
              Verifique sua conexão e tente novamente.
            </Alert>
          ) : !ocorrencias || ocorrencias.total === 0 ? (
            <p className="text-sm text-muted">Nenhuma ocorrência registrada.</p>
          ) : (
            <>
              <ul aria-label="Ocorrências por tipo" className="flex flex-wrap gap-2">
                {ocorrencias.porTipo
                  .filter((contagem) => contagem.total > 0)
                  .map((contagem) => (
                    <li key={contagem.tipo}>
                      <Badge variant={VARIANTE_TIPO[contagem.tipo]}>
                        {ROTULO_TIPO[contagem.tipo]}: {contagem.total}
                      </Badge>
                    </li>
                  ))}
              </ul>

              <ul aria-label="Ocorrências recentes" className="grid gap-2">
                {ocorrencias.recentes.map((ocorrencia) => (
                  <li
                    key={ocorrencia.id}
                    className="rounded-lg border border-line p-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={VARIANTE_TIPO[ocorrencia.tipo]}>
                        {ROTULO_TIPO[ocorrencia.tipo]}
                      </Badge>
                      <span className="text-xs text-muted">
                        {formatarDataHora(ocorrencia.occurredAt)}
                      </span>
                    </div>
                    <p className="mt-1 font-medium text-ink">
                      Pedido {ocorrencia.pedido} · {ocorrencia.item ?? 'Item'}
                    </p>
                    <p className="text-muted">
                      Setor: {ocorrencia.setor ?? '—'} · Responsável:{' '}
                      {ocorrencia.usuario ?? '—'}
                    </p>
                    {ocorrencia.motivo ? (
                      <p className="text-muted">Motivo: {ocorrencia.motivo}</p>
                    ) : null}
                    {ocorrencia.observacao ? (
                      <p className="text-ink">{ocorrencia.observacao}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

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
                {pcp.producaoPorSetor.map((producao) => {
                  const nome = producao.sectorName ?? producao.sectorId
                  const quantidade = `${producao.quantidade} ${rotuloDaUnidade(producao.unidade)}`
                  const percentual = percentualProducao(producao)
                  return (
                    <li key={`${producao.sectorId}-${producao.unidade ?? ''}`} className="grid gap-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-ink">{nome}</span>
                        <span className="font-semibold text-ink">{quantidade}</span>
                      </div>
                      <Progress
                        label={`Produção do setor ${nome}`}
                        value={percentual}
                        tone={percentual >= 100 ? 'success' : 'accent'}
                      />
                    </li>
                  )
                })}
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
