'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { apiGet } from '@/shared/http/api-client'
import { CODIGOS_SETOR, ehCodigoSetor, type CodigoSetor } from '@/modules/setores/codigos-setor'
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

/** Metadados de paginação devolvidos por `GET /api/pedidos` (A1). */
export interface PaginacaoPedidos {
  limite: number
  offset: number
  pagina: number
  total: number
  totalPaginas: number
}

interface RespostaPedidos {
  pedidos: PedidoListado[]
  paginacao: PaginacaoPedidos
}

/** Tamanho de página padrão da API (A1, D9). */
const TAMANHO_PAGINA = 20

interface Filtros {
  numero: string
  cliente: string
  setor: string
  status: string
  de: string
  ate: string
}

const FILTROS_VAZIOS: Filtros = { numero: '', cliente: '', setor: '', status: '', de: '', ate: '' }

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

const ROTULO_SETOR: Record<CodigoSetor, string> = {
  CORTE_DOBRA: 'Corte e Dobra',
  TELHAS: 'Telhas',
  REVENDA: 'Revenda',
}

const CLASSE_SELECT = `min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink ${FOCO_VISIVEL}`

/**
 * Monta os parâmetros da consulta (número como trecho do número comercial e
 * cliente como trecho do nome, sem diferenciar maiúsculas).
 */
function parametros(filtros: Filtros, pagina: number): URLSearchParams {
  const params = new URLSearchParams()
  if (filtros.numero.trim()) params.set('numero', filtros.numero.trim())
  if (filtros.cliente.trim()) params.set('cliente', filtros.cliente.trim())
  if (filtros.setor.trim()) params.set('setor', filtros.setor.trim())
  if (filtros.status) params.set('status', filtros.status)
  if (filtros.de) params.set('de', filtros.de)
  if (filtros.ate) params.set('ate', filtros.ate)
  // A primeira página usa os padrões da API (20/0); as demais explicitam a
  // paginação para não depender do default em outra camada.
  if (pagina > 1) {
    params.set('limite', String(TAMANHO_PAGINA))
    params.set('offset', String((pagina - 1) * TAMANHO_PAGINA))
  }
  return params
}

function montarUrl(filtros: Filtros, pagina: number): string {
  const query = parametros(filtros, pagina).toString()
  return `/api/pedidos${query ? `?${query}` : ''}`
}

/** Recupera os filtros da URL, preservando o contexto ao voltar do detalhe. */
function lerFiltrosDaUrl(): Filtros {
  if (typeof window === 'undefined') return FILTROS_VAZIOS
  const params = new URLSearchParams(window.location.search)
  return {
    numero: params.get('numero') ?? '',
    cliente: params.get('cliente') ?? '',
    setor: ehCodigoSetor(params.get('setor') ?? '') ? (params.get('setor') as CodigoSetor) : '',
    status: params.get('status') ?? '',
    de: params.get('de') ?? '',
    ate: params.get('ate') ?? '',
  }
}

/** Página atual da URL; valores inválidos voltam para a primeira (A1). */
function lerPaginaDaUrl(): number {
  if (typeof window === 'undefined') return 1
  const valor = Number(new URLSearchParams(window.location.search).get('pagina'))
  return Number.isInteger(valor) && valor > 0 ? valor : 1
}

/** Mantém a URL sincronizada com filtros e página (sem recarregar a página). */
function sincronizarUrl(filtros: Filtros, pagina: number): void {
  if (typeof window === 'undefined') return
  const params = parametros(filtros, pagina)
  params.delete('limite')
  params.delete('offset')
  if (pagina > 1) params.set('pagina', String(pagina))
  const query = params.toString()
  const url = `${window.location.pathname}${query ? `?${query}` : ''}`
  window.history.replaceState({}, '', url)
}

/**
 * Lista de pedidos com filtros de número comercial, cliente, setor, status e
 * período e os estados de carregando, vazio e erro (FEP-03, FEP-13). No
 * celular, a tabela vira cartões (sem rolagem horizontal da página) por CSS
 * (`.tabela-responsiva`).
 */
export function PedidosLista({ onSelecionar, recarregarToken }: PedidosListaProps) {
  const [filtros, setFiltros] = useState<Filtros>(() => lerFiltrosDaUrl())
  const [pagina, setPagina] = useState(() => lerPaginaDaUrl())
  const [pedidos, setPedidos] = useState<PedidoListado[] | null>(null)
  const [paginacao, setPaginacao] = useState<PaginacaoPedidos | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(false)
  const primeiraCarga = useRef(true)
  const filtrosIniciais = useRef(filtros)
  const paginaInicial = useRef(pagina)
  const ajudaPeriodoId = useId()

  const buscar = useCallback(
    (aplicados: Filtros, paginaBuscada: number) =>
      apiGet<RespostaPedidos>(montarUrl(aplicados, paginaBuscada))
        .then((dados) => {
          setPedidos(dados.pedidos)
          setPaginacao(dados.paginacao)
          setErro(false)
        })
        .catch(() => setErro(true))
        .finally(() => setCarregando(false)),
    [],
  )

  useEffect(() => {
    void buscar(filtrosIniciais.current, paginaInicial.current)
  }, [buscar])

  // Recarrega quando o token muda (ex.: após importar um pedido). O pedido novo
  // entra no topo da ordenação, então a lista volta para a primeira página (A1).
  useEffect(() => {
    if (primeiraCarga.current) {
      primeiraCarga.current = false
      return
    }
    setPagina(1)
    sincronizarUrl(filtros, 1)
    setCarregando(true)
    void buscar(filtros, 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregarToken])

  function aoFiltrar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setPagina(1)
    sincronizarUrl(filtros, 1)
    setCarregando(true)
    void buscar(filtros, 1)
  }

  function limparFiltros() {
    setFiltros(FILTROS_VAZIOS)
    setPagina(1)
    sincronizarUrl(FILTROS_VAZIOS, 1)
    setCarregando(true)
    void buscar(FILTROS_VAZIOS, 1)
  }

  function irParaPagina(destino: number) {
    const totalPaginas = paginacao?.totalPaginas ?? 0
    const nova = Math.min(Math.max(destino, 1), Math.max(totalPaginas, 1))
    setPagina(nova)
    sincronizarUrl(filtros, nova)
    setCarregando(true)
    void buscar(filtros, nova)
  }

  function tentarDeNovo() {
    setCarregando(true)
    void buscar(filtros, pagina)
  }

  const temFiltro = Object.values(filtros).some((valor) => valor.trim() !== '')

  return (
    <section className="grid gap-4">
      <form
        className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3"
        onSubmit={aoFiltrar}
        noValidate
      >
        <Field label="Pesquisar por número" hint="Trecho do número comercial do pedido.">
          {(props) => (
            <Input
              {...props}
              name="numero"
              inputMode="numeric"
              value={filtros.numero}
              onChange={(evento) =>
                setFiltros((atual) => ({ ...atual, numero: evento.target.value }))
              }
            />
          )}
        </Field>

        <Field label="Cliente" hint="Trecho do nome do cliente; não diferencia maiúsculas.">
          {(props) => (
            <Input
              {...props}
              name="cliente"
              value={filtros.cliente}
              onChange={(evento) =>
                setFiltros((atual) => ({ ...atual, cliente: evento.target.value }))
              }
            />
          )}
        </Field>

        <Field label="Setor">
          {(props) => (
            <select
              id={props.id}
              name="setor"
              aria-describedby={props['aria-describedby']}
              className={CLASSE_SELECT}
              value={filtros.setor}
              onChange={(evento) =>
                setFiltros((atual) => ({ ...atual, setor: evento.target.value }))
              }
            >
              <option value="">Todos</option>
              {CODIGOS_SETOR.map((codigo) => (
                <option key={codigo} value={codigo}>
                  {ROTULO_SETOR[codigo]}
                </option>
              ))}
            </select>
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
              onChange={(evento) =>
                setFiltros((atual) => ({ ...atual, status: evento.target.value }))
              }
            >
              <option value="">Todos</option>
              <option value="PENDING">Pendente</option>
              <option value="IN_PROGRESS">Em andamento</option>
              <option value="COMPLETED">Concluído</option>
            </select>
          )}
        </Field>

        <fieldset
          className="grid min-w-0 gap-1.5 border-0 p-0 sm:col-span-2 lg:col-span-2"
          aria-describedby={ajudaPeriodoId}
        >
          <legend className="text-sm font-semibold text-ink">Data de importação</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="De">
              {(props) => (
                <Input
                  {...props}
                  type="date"
                  name="de"
                  value={filtros.de}
                  onChange={(evento) =>
                    setFiltros((atual) => ({ ...atual, de: evento.target.value }))
                  }
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
                  onChange={(evento) =>
                    setFiltros((atual) => ({ ...atual, ate: evento.target.value }))
                  }
                />
              )}
            </Field>
          </div>
          <p id={ajudaPeriodoId} className="text-sm text-muted">
            Considera a entrada do pedido no 3E.
          </p>
        </fieldset>

        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
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
      ) : (
        <>
          {paginacao ? (
            <p className="text-sm text-muted" role="status">
              {paginacao.total} pedido(s) encontrado(s)
              {paginacao.totalPaginas > 1 && pagina <= paginacao.totalPaginas
                ? ` — página ${pagina} de ${paginacao.totalPaginas}`
                : ''}
              .
            </p>
          ) : null}

          {!pedidos || pedidos.length === 0 ? (
            paginacao && paginacao.total > 0 && pagina > 1 ? (
              <EmptyState
                title="Página não encontrada"
                description="Esta página não existe para os filtros atuais."
                action={
                  <Button variant="outline" onClick={() => irParaPagina(1)}>
                    Ir para a primeira página
                  </Button>
                }
              />
            ) : (
              <EmptyState
                title="Sem pedidos"
                description="Nenhum pedido encontrado com os filtros atuais."
              />
            )
          ) : (
            <>
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

              {paginacao && paginacao.totalPaginas > 1 ? (
                <nav
                  aria-label="Paginação"
                  className="flex flex-wrap items-center justify-between gap-3"
                >
                  <Button
                    variant="outline"
                    onClick={() => irParaPagina(pagina - 1)}
                    disabled={pagina <= 1}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted" aria-current="page">
                    Página {Math.min(pagina, paginacao.totalPaginas)} de {paginacao.totalPaginas}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => irParaPagina(pagina + 1)}
                    disabled={pagina >= paginacao.totalPaginas}
                  >
                    Próxima
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </>
      )}
    </section>
  )
}
