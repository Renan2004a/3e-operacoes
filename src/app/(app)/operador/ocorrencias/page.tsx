'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { apiGet } from '@/shared/http/api-client'
import type { ActivityStatus } from '@/modules/producao/tipos'
import type { TipoOcorrencia } from '@/modules/ocorrencias/motivos'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { Field } from '@/shared/ui/field'
import { OcorrenciaForm } from '@/shared/ui/ocorrencia-form'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'

interface AtividadeFila {
  id: string
  orderNumber?: string | null
  itemDescription?: string | null
  productCode?: string | null
  sectorName?: string | null
  status: ActivityStatus
}

interface OcorrenciaDetalhada {
  id: string
  activityId: string
  tipo: TipoOcorrencia
  quantidade: string | number | null
  observacao: string | null
  occurredAt: string
  motivo: string | null
  pedido: string
  item: string | null
  setor: string | null
  usuario: string | null
  activityStatus: ActivityStatus | null
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

const CLASSE_SELECT = `min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink ${FOCO_VISIVEL}`

function formatarDataHora(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

/** Lê a atividade pré-selecionada da URL (`?atividade=ID`). */
function atividadeDaUrl(): string {
  if (typeof window === 'undefined') return ''
  return new URLSearchParams(window.location.search).get('atividade') ?? ''
}

/**
 * Ocorrências do Operador (OCO-07): registrar para uma das suas atividades e
 * consultar o histórico. Separada da execução para não sobrecarregar a tela de
 * trabalho e manter o fluxo simples no chão de fábrica.
 */
export default function OcorrenciasPage() {
  const [atividades, setAtividades] = useState<AtividadeFila[] | null>(null)
  const [ocorrencias, setOcorrencias] = useState<OcorrenciaDetalhada[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(() => atividadeDaUrl())
  const [recarregarToken, setRecarregarToken] = useState(0)

  const carregar = useCallback(
    () =>
      Promise.all([
        apiGet<{ atividades: AtividadeFila[] }>('/api/producao/atividades'),
        apiGet<{ ocorrencias: OcorrenciaDetalhada[] }>('/api/producao/ocorrencias'),
      ])
        .then(([fila, lista]) => {
          setAtividades(fila.atividades)
          setOcorrencias(lista.ocorrencias)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void carregar()
  }, [carregar])

  // A pré-seleção vinda da URL (`?atividade=ID`) é aplicada após montar, para
  // não se perder na hidratação do componente no cliente.
  useEffect(() => {
    const daUrl = atividadeDaUrl()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- pré-seleção vinda da URL, aplicada após a hidratação
    if (daUrl) setAtividadeSelecionada(daUrl)
  }, [])

  // Após registrar, recarrega só a lista de ocorrências para refletir o banco.
  useEffect(() => {
    if (recarregarToken === 0) return
    apiGet<{ ocorrencias: OcorrenciaDetalhada[] }>('/api/producao/ocorrencias')
      .then((lista) => setOcorrencias(lista.ocorrencias))
      .catch(() => setErro(true))
  }, [recarregarToken])

  function tentarDeNovo() {
    setCarregando(true)
    void carregar()
  }

  const atividade = atividades?.find((item) => item.id === atividadeSelecionada) ?? null

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
        title="Não foi possível carregar as ocorrências"
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
          ← Voltar para meus pedidos
        </Link>
        <PageHead
          title="Ocorrências"
          description="Registre problemas da produção e consulte o que já foi registrado."
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar ocorrência</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {!atividades || atividades.length === 0 ? (
            <Alert variant="info" title="Nenhuma atividade disponível">
              Você não tem atividades nos seus setores no momento. Volte para a lista de pedidos.
            </Alert>
          ) : (
            <>
              <Field
                label="Atividade"
                hint="Escolha o pedido/item em que o problema aconteceu."
                required
              >
                {(props) => (
                  <select
                    id={props.id}
                    aria-describedby={props['aria-describedby']}
                    className={CLASSE_SELECT}
                    value={atividadeSelecionada}
                    onChange={(evento) => setAtividadeSelecionada(evento.target.value)}
                  >
                    <option value="">Selecione…</option>
                    {atividades.map((opcao) => (
                      <option key={opcao.id} value={opcao.id}>
                        Pedido {opcao.orderNumber ?? '—'} ·{' '}
                        {opcao.itemDescription ?? opcao.productCode ?? 'Item'} ·{' '}
                        {opcao.sectorName ?? 'Setor'}
                      </option>
                    ))}
                  </select>
                )}
              </Field>

              {atividade ? (
                <OcorrenciaForm
                  key={atividade.id}
                  atividadeId={atividade.id}
                  onRegistrada={() => setRecarregarToken((valor) => valor + 1)}
                />
              ) : (
                <p className="text-sm text-muted">
                  Escolha a atividade acima para preencher a ocorrência.
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas ocorrências</CardTitle>
        </CardHeader>
        <CardContent>
          {!ocorrencias || ocorrencias.length === 0 ? (
            <EmptyState
              title="Nenhuma ocorrência registrada"
              description="Quando você registrar uma perda, refugo ou outro problema, ele aparecerá aqui."
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted" role="status">
                {ocorrencias.length} ocorrência(s) registrada(s) por você.
              </p>
              <ul className="grid gap-3" aria-label="Minhas ocorrências">
                {ocorrencias.map((ocorrencia) => (
                  <li
                    key={ocorrencia.id}
                    className="rounded-lg border border-line bg-surface-2 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={VARIANTE_TIPO[ocorrencia.tipo]}>
                        {ROTULO_TIPO[ocorrencia.tipo]}
                      </Badge>
                      <span className="text-xs text-muted">
                        {formatarDataHora(ocorrencia.occurredAt)}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-ink">
                      Pedido {ocorrencia.pedido} · {ocorrencia.item ?? 'Item'}
                    </p>
                    <p className="text-muted">
                      Setor: {ocorrencia.setor ?? '—'} ·{' '}
                      {ocorrencia.motivo ?? 'Sem motivo informado'}
                      {ocorrencia.quantidade !== null
                        ? ` · Quantidade: ${ocorrencia.quantidade}`
                        : ''}
                    </p>
                    {ocorrencia.observacao ? (
                      <p className="mt-1 text-ink">{ocorrencia.observacao}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted">
                      Registrado por {ocorrencia.usuario ?? '—'}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
