'use client'

import { useState } from 'react'
import { apiGet } from '@/shared/http/api-client'
import { formatarDiaCivil } from '@/shared/time/dia-civil'
import { APP_TIMEZONE } from '@/shared/time/timezone'
import { Alert } from './alert'
import { Spinner } from './spinner'
import { cn, FOCO_VISIVEL } from './utils'

interface EntradaHistorico {
  id: string
  createdAt: string
  userName: string | null
  before: string | null
  after: string | null
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

function descricaoDaAlteracao(entrada: EntradaHistorico): string {
  if (!entrada.after) return 'Prazo removido'
  if (!entrada.before) return `Definido para ${formatarDiaCivil(entrada.after)}`
  return `${formatarDiaCivil(entrada.before)} → ${formatarDiaCivil(entrada.after)}`
}

/**
 * Histórico de alterações do prazo de entrega do item (AD-009).
 * Carrega sob demanda para não pesar a abertura do detalhe.
 */
export function HistoricoPrazos({ itemId }: { itemId: string }) {
  const [aberto, setAberto] = useState(false)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState(false)
  const [historico, setHistorico] = useState<EntradaHistorico[] | null>(null)

  async function carregar() {
    setCarregando(true)
    setErro(false)
    try {
      const dados = await apiGet<{ historico: EntradaHistorico[] }>(
        `/api/pedidos/itens/${itemId}/prazo/historico`,
      )
      setHistorico(dados.historico)
    } catch {
      setErro(true)
    } finally {
      setCarregando(false)
    }
  }

  function alternar() {
    const proximo = !aberto
    setAberto(proximo)
    if (proximo && historico === null && !carregando) void carregar()
  }

  return (
    <div className="rounded-lg border border-line bg-surface-2 p-3">
      <button
        type="button"
        className={cn('flex w-full items-center gap-2 text-left text-sm font-semibold text-ink', FOCO_VISIVEL)}
        aria-expanded={aberto}
        onClick={alternar}
      >
        <span aria-hidden="true" className="text-muted">
          {aberto ? '▾' : '▸'}
        </span>
        Histórico de prazos
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
                  onClick={() => void carregar()}
                >
                  Tentar de novo
                </button>
              }
            >
              Verifique sua conexão e tente novamente.
            </Alert>
          ) : null}

          {!carregando && !erro && historico?.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma alteração de prazo registrada.</p>
          ) : null}

          {!carregando && !erro && historico && historico.length > 0 ? (
            <ol className="grid gap-2" aria-label="Alterações de prazo">
              {historico.map((entrada) => (
                <li key={entrada.id} className="rounded-md border border-line bg-surface p-2 text-sm">
                  <p className="font-medium text-ink">
                    {formatarDataHora(entrada.createdAt)} · {entrada.userName ?? 'Usuário não identificado'}
                  </p>
                  <p className="text-muted">{descricaoDaAlteracao(entrada)}</p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
