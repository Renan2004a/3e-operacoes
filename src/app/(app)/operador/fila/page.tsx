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
import { Spinner } from '@/shared/ui/spinner'

interface Atividade {
  id: string
  orderItemId: string
  sectorId: string
  status: ActivityStatus
  priority: number
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

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErro(false)
    try {
      const dados = await apiGet<{ atividades: Atividade[] }>('/api/producao/atividades')
      setAtividades(dados.atividades)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

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
        action={<Button onClick={() => void carregar()}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  if (!atividades || atividades.length === 0) {
    return (
      <EmptyState
        title="Sem atividades na fila"
        description="Não há atividades nos seus setores no momento."
      />
    )
  }

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Minha fila</h1>
        <p className="text-sm text-muted">Atividades dos seus setores.</p>
      </header>

      <ul className="grid gap-3">
        {atividades.map((atividade) => (
          <li key={atividade.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <CardTitle className="text-base">Atividade {atividade.id}</CardTitle>
                  <p className="text-sm text-muted">
                    Item {atividade.orderItemId} · Setor {atividade.sectorId}
                  </p>
                  <Badge variant={VARIANTE_STATUS[atividade.status]} className="mt-2">
                    {ROTULO_STATUS[atividade.status]}
                  </Badge>
                </div>
                <Link
                  href={`/operador/atividades/${atividade.id}`}
                  className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 font-semibold text-white hover:bg-accent-dark"
                >
                  Abrir
                </Link>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </section>
  )
}
