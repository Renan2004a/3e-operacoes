'use client'

import { useCallback, useEffect, useState } from 'react'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { Field } from './field'
import { Input } from './input'
import { Spinner } from './spinner'

export type StatusPedido = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface PedidoListado {
  id: string
  numero: string
  cliente: string | null
  status: StatusPedido
}

export interface PedidosListaProps {
  /** Aciona o detalhe do pedido escolhido (rota no gerente, painel no vendedor). */
  onSelecionar: (pedido: PedidoListado) => void
}

interface Filtros {
  cliente: string
  setor: string
  status: string
  de: string
  ate: string
}

const FILTROS_VAZIOS: Filtros = { cliente: '', setor: '', status: '', de: '', ate: '' }

const ROTULO_STATUS: Record<StatusPedido, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluído',
}

const VARIANTE_STATUS: Record<StatusPedido, 'neutral' | 'info' | 'success'> = {
  PENDING: 'neutral',
  IN_PROGRESS: 'info',
  COMPLETED: 'success',
}

const CLASSE_SELECT =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink'

/**
 * Monta a URL da consulta. O cliente é enviado como trecho (substring) e sem
 * transformar maiúsculas: a comparação sem diferenciar maiúsculas acontece no
 * servidor (QF-09).
 */
function montarUrl(filtros: Filtros): string {
  const params = new URLSearchParams()
  if (filtros.cliente.trim()) params.set('cliente', filtros.cliente.trim())
  if (filtros.setor.trim()) params.set('setor', filtros.setor.trim())
  if (filtros.status) params.set('status', filtros.status)
  if (filtros.de) params.set('de', filtros.de)
  if (filtros.ate) params.set('ate', filtros.ate)
  const query = params.toString()
  return `/api/pedidos${query ? `?${query}` : ''}`
}

/**
 * Lista de pedidos com filtros de cliente, setor, status e período e os estados
 * de carregando, vazio e erro (FEP-03, FEP-13). Compartilhada entre gerente e
 * vendedor; a seleção é delegada ao chamador.
 */
export function PedidosLista({ onSelecionar }: PedidosListaProps) {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VAZIOS)
  const [pedidos, setPedidos] = useState<PedidoListado[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)

  const buscar = useCallback(
    (aplicados: Filtros) =>
      apiGet<{ pedidos: PedidoListado[] }>(montarUrl(aplicados))
        .then((dados) => {
          setPedidos(dados.pedidos)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void buscar(FILTROS_VAZIOS)
  }, [buscar])

  function aoFiltrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setCarregando(true)
    void buscar(filtros)
  }

  function tentarDeNovo() {
    setCarregando(true)
    void buscar(filtros)
  }

  return (
    <section className="grid gap-4">
      <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" onSubmit={aoFiltrar} noValidate>
        <Field label="Cliente" hint="Trecho do nome do cliente; não diferencia maiúsculas.">
          {(props) => (
            <Input
              {...props}
              name="cliente"
              value={filtros.cliente}
              onChange={(evento) => setFiltros((atual) => ({ ...atual, cliente: evento.target.value }))}
            />
          )}
        </Field>

        <Field label="Setor">
          {(props) => (
            <Input
              {...props}
              name="setor"
              value={filtros.setor}
              onChange={(evento) => setFiltros((atual) => ({ ...atual, setor: evento.target.value }))}
            />
          )}
        </Field>

        <Field label="Status">
          {(props) => (
            <select
              id={props.id}
              name="status"
              aria-describedby={props['aria-describedby']}
              className={CLASSE_SELECT}
              value={filtros.status}
              onChange={(evento) => setFiltros((atual) => ({ ...atual, status: evento.target.value }))}
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluído</option>
            </select>
          )}
        </Field>

        <Field label="De">
          {(props) => (
            <Input
              {...props}
              type="date"
              name="de"
              value={filtros.de}
              onChange={(evento) => setFiltros((atual) => ({ ...atual, de: evento.target.value }))}
            />
          )}
        </Field>

        <Field label="Até">
          {(props) => (
            <Input
              {...props}
              type="date"
              name="ate"
              value={filtros.ate}
              onChange={(evento) => setFiltros((atual) => ({ ...atual, ate: evento.target.value }))}
            />
          )}
        </Field>

        <div className="sm:col-span-2 lg:col-span-5">
          <Button type="submit">Filtrar</Button>
        </div>
      </form>

      {carregando ? (
        <Spinner />
      ) : erro ? (
        <Alert
          variant="error"
          title="Não foi possível carregar os pedidos"
          action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
        >
          Verifique sua conexão e tente novamente.
        </Alert>
      ) : !pedidos || pedidos.length === 0 ? (
        <EmptyState title="Sem pedidos" description="Nenhum pedido encontrado com os filtros atuais." />
      ) : (
        <ul aria-label="Pedidos" className="grid gap-3">
          {pedidos.map((pedido) => (
            <li
              key={pedido.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-line bg-surface p-4"
            >
              <div className="min-w-0">
                <p className="font-semibold text-ink">Pedido {pedido.numero}</p>
                <p className="text-sm text-muted">{pedido.cliente ?? 'Sem cliente'}</p>
                <Badge variant={VARIANTE_STATUS[pedido.status]} className="mt-2">
                  {ROTULO_STATUS[pedido.status]}
                </Badge>
              </div>
              <Button onClick={() => onSelecionar(pedido)} aria-label={`Abrir pedido ${pedido.numero}`}>
                Abrir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
