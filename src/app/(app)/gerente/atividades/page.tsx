'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { ActivityStatus } from '@/modules/producao/tipos'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'

interface AtividadeIndicador {
  id: string
  orderId: string
  orderNumber: string
  itemDescription: string | null
  sectorName: string
  status: ActivityStatus
  priority: number
  deadlineAt: string | null
}

type Filtro = ActivityStatus | 'ABERTAS'

const TITULO: Record<Filtro, string> = {
  ABERTAS: 'Atividades pendentes',
  PENDING: 'Atividades a iniciar',
  IN_PROGRESS: 'Atividades em execução',
  PAUSED: 'Atividades pausadas',
  COMPLETED: 'Atividades concluídas',
  DIVERGENT: 'Atividades divergentes',
}

const ROTULO_STATUS: Record<ActivityStatus, string> = {
  PENDING: 'A iniciar',
  IN_PROGRESS: 'Em execução',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  DIVERGENT: 'Divergente',
}

const VARIANTE_STATUS: Record<
  ActivityStatus,
  'neutral' | 'info' | 'warning' | 'success' | 'danger'
> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  PAUSED: 'warning',
  COMPLETED: 'success',
  DIVERGENT: 'danger',
}

/** Lê o filtro da URL sem depender de `useSearchParams` (evita Suspense). */
function filtroDaUrl(): Filtro {
  if (typeof window === 'undefined') return 'ABERTAS'
  const valor = new URLSearchParams(window.location.search).get('status')
  return valor && valor in TITULO ? (valor as Filtro) : 'ABERTAS'
}

/** Data civil (YYYY-MM-DD) sem deslocamento de fuso. */
function formatarDia(valor: string | null): string {
  if (!valor) return 'sem prazo'
  const [ano, mes, dia] = valor.slice(0, 10).split('-')
  return `${dia}/${mes}/${ano}`
}

/** Lista as atividades por status, aberta a partir dos cartões do painel (P07). */
export default function AtividadesPage() {
  const [filtro] = useState<Filtro>(filtroDaUrl)
  const [atividades, setAtividades] = useState<AtividadeIndicador[] | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const buscar = useCallback(
    () =>
      apiGet<{ atividades: AtividadeIndicador[] }>(
        `/api/indicadores/atividades?status=${filtro}`,
      )
        .then((dados) => {
          setAtividades(dados.atividades)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [filtro],
  )

  useEffect(() => {
    void buscar()
  }, [buscar])

  function tentarDeNovo() {
    setCarregando(true)
    void buscar()
  }

  const voltar = (
    <Link href="/gerente/painel" className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}>
      ← Voltar para o painel
    </Link>
  )

  if (carregando) {
    return (
      <div className="grid gap-3 p-2">
        {voltar}
        <Spinner />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="grid gap-3">
        {voltar}
        <Alert
          variant="error"
          title="Não foi possível carregar as atividades"
          action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
        >
          Verifique sua conexão e tente novamente.
        </Alert>
      </div>
    )
  }

  const lista = atividades ?? []

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        {voltar}
        <PageHead
          title={TITULO[filtro]}
          description="Uma linha por atividade. Abra o pedido para ver o item e o setor."
        />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          title="Nada por aqui"
          description="Nenhuma atividade encontrada para este filtro."
        />
      ) : (
        <ul aria-label={TITULO[filtro]} className="grid gap-2">
          {lista.map((atividade) => (
            <li key={atividade.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      Pedido {atividade.orderNumber} ·{' '}
                      {atividade.itemDescription ?? 'Item sem descrição'}
                    </p>
                    <p className="text-sm text-muted">
                      Setor: {atividade.sectorName} · Prazo: {formatarDia(atividade.deadlineAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={VARIANTE_STATUS[atividade.status]}>
                      {ROTULO_STATUS[atividade.status]}
                    </Badge>
                    <Link
                      href={`/gerente/pedidos/${atividade.orderId}`}
                      className={cn(
                        'inline-flex min-h-11 items-center justify-center rounded-lg border border-line px-4 font-semibold text-ink hover:bg-surface-2',
                        FOCO_VISIVEL,
                      )}
                      aria-label={`Abrir pedido ${atividade.orderNumber}, ${atividade.itemDescription ?? 'item'}`}
                    >
                      Abrir pedido
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
