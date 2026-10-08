'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ApiError, apiGet } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'

interface Ordem {
  atividadeId: string
  pedido: string
  item: string
  setor: string
  unidade: string
  solicitado: string | number
  executado: string | number
  pendente: string | number
}

/**
 * Ordem de produção da atividade (RF018): pedido, item, setor, solicitado,
 * executado e pendente, com impressão sem menu (LAC-07, LAC-08).
 */
export default function OrdemProducaoPage() {
  const params = useParams<{ id: string }>()
  const atividadeId = params.id

  const [ordem, setOrdem] = useState<Ordem | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<'falha' | 'nao_encontrado' | null>(null)

  const buscar = useCallback(
    () =>
      apiGet<{ ordem: Ordem }>(`/api/producao/atividades/${atividadeId}/ordem`)
        .then((dados) => {
          setOrdem(dados.ordem)
          setErro(null)
        })
        .catch((error) => {
          if (error instanceof ApiError && error.status === 404) setErro('nao_encontrado')
          else setErro('falha')
        })
        .finally(() => setCarregando(false)),
    [atividadeId],
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

  if (erro === 'nao_encontrado') {
    return (
      <Alert variant="error" title="Atividade não encontrada">
        A atividade informada não existe ou foi removida.
      </Alert>
    )
  }

  if (erro || !ordem) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar a ordem"
        action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-2 print:hidden">
        <Link
          href="/operador/fila"
          className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}
        >
          ← Voltar para a fila
        </Link>
        <PageHead
          title={`Ordem de produção`}
          description={`Atividade ${ordem.atividadeId}`}
          actions={
            <Button onClick={() => window.print()} aria-label="Imprimir ordem de produção">
              Imprimir
            </Button>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>{ordem.item}</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Pedido {ordem.pedido} · Setor {ordem.setor}
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-2 text-sm text-ink sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Pedido</dt>
              <dd className="font-semibold">{ordem.pedido}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Item</dt>
              <dd className="font-semibold">{ordem.item}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Setor</dt>
              <dd className="font-semibold">{ordem.setor}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Unidade</dt>
              <dd className="font-semibold">{ordem.unidade}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Solicitado</dt>
              <dd className="font-semibold">
                {ordem.solicitado} {ordem.unidade}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Executado</dt>
              <dd className="font-semibold">
                {ordem.executado} {ordem.unidade}
              </dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted">Pendente</dt>
              <dd className="font-semibold">
                {ordem.pendente} {ordem.unidade}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </section>
  )
}
