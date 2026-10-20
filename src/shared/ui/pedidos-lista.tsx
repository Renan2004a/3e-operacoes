'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { apiGet } from '@/shared/http/api-client'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { EmptyState } from './empty-state'
import { Field } from './field'
import { Input } from './input'
import { Spinner } from './spinner'
import { FOCO_VISIVEL } from './utils'

export type StatusPedido = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface PedidoListado {
  id: string
  numero: string
  cliente: string | null
  status: StatusPedido
}

export interface PedidosListaProps {
  /** Aciona o detalhe do pedido escolhido (rota no gerente e no vendedor). */
  onSelecionar: (pedido: PedidoListado) => void
  /** Alterar este valor força recarregar a lista (ex.: após importar um pedido). */
  recarregarToken?: number
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

const CLASSE_SELECT = `min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink ${FOCO_VISIVEL}`

/** Monta os parâmetros da consulta (cliente como trecho, sem diferenciar maiúsculas). */
function parametros(filtros: Filtros): URLSearchParams {
  const params = new URLSearchParams()
  if (filtros.cliente.trim()) params.set('cliente', filtros.cliente.trim())
  if (filtros.setor.trim()) params.set('setor', filtros.setor.trim())
  if (filtros.status) params.set('status', filtros.status)
  if (filtros.de) params.set('de', filtros.de)
  if (filtros.ate) params.set('ate', filtros.ate)
  return params
}

function montarUrl(filtros: Filtros): string {
  const query = parametros(filtros).toString()
  return `/api/pedidos${query ? `?${query}` : ''}`
}

/** Recupera os filtros da URL, preservando o contexto ao voltar do detalhe. */
function lerFiltrosDaUrl(): Filtros {
  if (typeof window === 'undefined') return FILTROS_VAZIOS
  const params = new URLSearchParams(window.location.search)
  return {
    cliente: params.get('cliente') ?? '',
    setor: params.get('setor') ?? '',
    status: params.get('status') ?? '',
    de: params.get('de') ?? '',
    ate: params.get('ate') ?? '',
  }
}

/** Mantém a URL sincronizada com os filtros aplicados (sem recarregar a página). */
function sincronizarUrl(filtros: Filtros): void {
  if (typeof window === 'undefined') return
  const query = parametros(filtros).toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState({}, '', url)
}

/**
 * Lista de pedidos com filtros de cliente, setor, status e período e os estados
 * de carregando, vazio e erro (FEP-03, FEP-13). No celular, a tabela vira
 * cartões (sem rolagem horizontal da página) por CSS (`.tabela-responsiva`).
 */
export function PedidosLista({ onSelecionar, recarregarToken }: PedidosListaProps) {
  const [filtros, setFiltros] = useState<Filtros>(() => lerFiltrosDaUrl())
  const [pedidos, setPedidos] = useState<PedidoListado[] | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const primeiraCarga = useRef(true)
  const filtrosIniciais = useRef(filtros)

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
    void buscar(filtrosIniciais.current)
  }, [buscar])

  // Recarrega quando o token muda (ex.: após importar um pedido).
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false
      return
    }
    setCarregando(true)
    void buscar(filtros)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregarToken])

  function aoFiltrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    sincronizarUrl(filtros)
    setCarregando(true)
    void buscar(filtros)
  }

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS)
    sincronizarUrl(FILTROS_VAZIOS)
    setCarregando(true)
    void buscar(FILTROS_VAZIOS)
  }

  function tentarDeNovo() {
    setCarregando(true)
    void buscar(filtros)
  }

  const temFiltro = Object.values(filtros).some((valor) => valor.trim() !== '')

  return (
    <section className="grid gap-4">
      <form
        className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-5"
        onSubmit={aoFiltrar}
        noValidate
      >
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

        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-5">
          <Button type="submit">Filtrar</Button>
          {temFiltro ? (
            <Button type="button" variant="outline" onClick={limparFiltros}>
              Limpar filtros
            </Button>
          ) : null}
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
        <>
          <p className="text-sm text-muted" role="status">
            {pedidos.length} pedido(s) encontrado(s).
          </p>
          <div className="overflow-x-auto rounded-card border border-line bg-surface">
            <table
              aria-label="Pedidos"
              className="tabela-responsiva w-full border-collapse text-left text-sm"
            >
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Pedido
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Cliente
                  </th>
                  <th scope="col" className="px-4 py-3 font-semibold">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {pedidos.map((pedido) => (
                  <tr
                    key={pedido.id}
                    className="border-b border-line last:border-b-0 hover:bg-surface-2"
                  >
                    <td
                      data-label="Pedido"
                      className="whitespace-nowrap px-4 py-3 font-semibold text-ink"
                    >
                      Pedido {pedido.numero}
                    </td>
                    <td data-label="Cliente" className="px-4 py-3 text-muted">
                      {pedido.cliente ?? 'Sem cliente'}
                    </td>
                    <td data-label="Status" className="px-4 py-3">
                      <Badge variant={VARIANTE_STATUS[pedido.status]}>
                        {ROTULO_STATUS[pedido.status]}
                      </Badge>
                    </td>
                    <td data-label="Ações" className="px-4 py-3 md:text-right">
                      <Button
                        size="sm"
                        onClick={() => onSelecionar(pedido)}
                        aria-label={`Abrir pedido ${pedido.numero}`}
                      >
                        Abrir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  )
}
