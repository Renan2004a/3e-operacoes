'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import type { ActivityStatus } from '@/modules/producao/tipos'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardTitle } from '@/shared/ui/card'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'
interface Atividade {
  id: string
  orderItemId: string
  sectorId: string
  status: ActivityStatus
  priority: number
  itemDescription?: string | null
  productCode?: string | null
  orderNumber?: string | null
  sectorName?: string | null
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

export default function FilaPage() {
  const [atividades, setAtividades] = useState<Atividade[] | null>(null)
  const [erro, setErro] = useState(false)
  const [carregando, setCarregando] = useState(true)

  const buscar = useCallback(
    () =>
      apiGet<{ atividades: Atividade[] }>('/api/producao/atividades')
        .then((dados) => {
          setAtividades(dados.atividades)
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

  if (erro) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar a fila"
        action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  const listaAtividades = atividades ?? []

  return (
    <section className="grid gap-4">
      <PageHead
        title="Fila de produção"
        description="Atividades em aberto nos setores. Abra uma atividade para registrar a produção."
      />

      {listaAtividades.length === 0 ? (
        <EmptyState
          title="Nenhuma atividade em aberto"
          description="Quando houver atividades nos setores, elas aparecerão aqui."
        />
      ) : (
        <ul aria-label="Minhas atividades" className="grid gap-3">
          {listaAtividades.map((atividade) => (
            <li key={atividade.id}>
              <Card>
                <CardContent className="grid gap-3 pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                        {atividade.priority > 0
                          ? `Prioridade ${atividade.priority} · `
                          : ''}
                        {atividade.sectorName ?? 'Setor'}
                      </p>
                      <CardTitle className="mt-1 text-base">
                        {atividade.itemDescription ?? atividade.productCode ?? 'Item sem descrição'}
                      </CardTitle>
                      <p className="mt-1 text-sm text-muted">
                        Pedido {atividade.orderNumber ?? '—'}
                      </p>
                    </div>
                    <Badge variant={VARIANTE_STATUS[atividade.status]}>
                      {ROTULO_STATUS[atividade.status]}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/operador/atividades/${atividade.id}`}
                      aria-label={`Abrir atividade do pedido ${atividade.orderNumber ?? ''}`}
                      className={cn(
                        'inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-dark',
                        FOCO_VISIVEL,
                      )}
                    >
                      Abrir atividade
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
