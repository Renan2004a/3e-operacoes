'use client'

import { useEffect, useState } from 'react'
import { apiGet } from '@/shared/http/api-client'
import { APP_TIMEZONE } from '@/shared/time/timezone'
import { Alert } from './alert'
import { Badge } from './badge'
import { Spinner } from './spinner'
import { formatarQuantidadeParaExibicao } from './totais-unidade'
import { cn, FOCO_VISIVEL } from './utils'

interface EntregaHistorico {
  id: string
  quantidade: string | number
  usuarioNome: string
  occurredAt: string
  excecao: boolean
}

function formatarDataHora(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: APP_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(data)
}

export interface HistoricoEntregasProps {
  itemId: string
  unidade?: string | null
  /** Quando muda (ex.: total entregue), um histórico aberto é recarregado. */
  atualizarQuando?: string | number
}

/**
 * Histórico de entregas do item (EXP-11): quantidade, quem entregou e quando,
 * com a exceção acima do disponível marcada em texto. Carrega sob demanda,
 * como o histórico de prazos, e a entrega mais recente aparece primeiro.
 */
export function HistoricoEntregas({
  itemId,
  unidade = null,
  atualizarQuando,
}: HistoricoEntregasProps) {
  const [aberto, setAberto] = useState(false)
  const [erro, setErro] = useState(false)
  const [entregas, setEntregas] = useState<EntregaHistorico[] | null>(null)
  const [tentativa, setTentativa] = useState(0)
  // Só a primeira carga mostra o indicador; recargas (nova entrega) são silenciosas.
  const carregando = aberto && entregas === null && !erro

  useEffect(() => {
    // Carrega ao abrir e recarrega se uma entrega for registrada com o histórico
    // aberto, sem exigir fechar e abrir de novo.
    if (!aberto) return
    let cancelado = false
    apiGet<{ entregas: EntregaHistorico[] }>(`/api/pedidos/itens/${itemId}/entregas`)
      .then((dados) => {
        if (cancelado) return
        setEntregas([...dados.entregas].reverse())
        setErro(false)
      })
      .catch(() => {
        if (!cancelado) setErro(true)
      })
    return () => {
      cancelado = true
    }
  }, [aberto, itemId, atualizarQuando, tentativa])

  function tentarDeNovo() {
    setErro(false)
    setTentativa((atual) => atual + 1)
  }

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <button
        type="button"
        className={cn(
          'flex w-full items-center gap-2 text-left text-sm font-semibold text-ink',
          FOCO_VISIVEL,
        )}
        aria-expanded={aberto}
        onClick={() => setAberto((atual) => !atual)}
      >
        <span aria-hidden="true" className="text-muted">
          {aberto ? '▾' : '▸'}
        </span>
        Histórico de entregas
      </button>

      {aberto ? (
        <div className="mt-2 grid gap-2">
          {carregando ? <Spinner label="Carregando histórico…" /> : null}

          {erro ? (
            <Alert
              variant="error"
              title="Não foi possível carregar o histórico"
              action={
                <button
                  type="button"
                  className={cn('text-sm font-medium text-accent underline', FOCO_VISIVEL)}
                  onClick={tentarDeNovo}
                >
                  Tentar de novo
                </button>
              }
            >
              Verifique sua conexão e tente novamente.
            </Alert>
          ) : null}

          {!carregando && !erro && entregas?.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma entrega registrada.</p>
          ) : null}

          {!carregando && !erro && entregas && entregas.length > 0 ? (
            <ol className="grid gap-2" aria-label="Entregas registradas">
              {entregas.map((entrega) => (
                <li
                  key={entrega.id}
                  className="rounded-md border border-line bg-surface p-2 text-sm"
                >
                  <p className="flex flex-wrap items-center gap-2 font-medium text-ink">
                    {formatarDataHora(entrega.occurredAt)} · {entrega.usuarioNome}
                    {entrega.excecao ? <Badge variant="warning">Exceção autorizada</Badge> : null}
                  </p>
                  <p className="text-muted">
                    {formatarQuantidadeParaExibicao(unidade, entrega.quantidade)}
                    {unidade ? ` ${unidade}` : ''} entregues
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
