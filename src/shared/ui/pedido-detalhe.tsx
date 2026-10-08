'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, apiGet, apiPatch, apiPost } from '@/shared/http/api-client'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Field } from './field'
import { Input } from './input'
import { PageHead } from './page-head'
import { Spinner } from './spinner'
import { cn, FOCO_VISIVEL } from './utils'

interface ItemSaldo {
  itemId: string
  solicitado: string | number
  executado: string | number
  disponivel: string | number
  entregue: string | number
  pendente: string | number
  description: string | null
  productCode: string | null
  unit: string
  classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  sectorCode?: string | null
  sectorName?: string | null
  activityStatus?: string | null
}

interface Setor {
  id: string
  code: string
  name: string
  active: boolean
}

const CLASSE_SELECT =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink'

const ROTULO_SITUACAO: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em execução',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  DIVERGENT: 'Divergente',
}

/** Agrupa os itens por setor para o desmembramento operacional. */
function agruparPorSetor(itens: ItemSaldo[]) {
  const mapa = new Map<string, { itens: number; solicitado: number; pendente: number }>()
  for (const item of itens) {
    const chave = item.sectorName ?? 'Não classificado'
    const atual = mapa.get(chave) ?? { itens: 0, solicitado: 0, pendente: 0 }
    atual.itens += 1
    atual.solicitado += Number(item.solicitado) || 0
    atual.pendente += Number(item.pendente) || 0
    mapa.set(chave, atual)
  }
  return Array.from(mapa.entries()).map(([setor, dados]) => ({ setor, ...dados }))
}

interface PedidoDetalhado {
  id: string
  numero: string
  cliente: string | null
  customerName: string | null
  sellerLegacyCode: string | null
  itens: ItemSaldo[]
}

export interface PedidoDetalheProps {
  orderId: string
  /** Rota da lista, usada no link de voltar. */
  basePath?: string
  /** Habilita a classificação manual dos itens pendentes (LAC-04, LAC-05, LAC-06). */
  permitirClassificacao?: boolean
}

/**
 * Detalhe do pedido com os cinco valores por item e a definição de prazo
 * (FEP-04, FEP-05). Reutilizado pelo gerente e pelo vendedor; o vendedor apenas
 * consulta a produção e define prazo. Com `permitirClassificacao`, o gerente
 * classifica itens pendentes escolhendo o setor (LAC-04, LAC-05, LAC-06).
 */
export function PedidoDetalhe({
  orderId,
  basePath = '/gerente/pedidos',
  permitirClassificacao = false,
}: PedidoDetalheProps) {
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<'falha' | 'nao_encontrado' | null>(null)

  const [rascunhos, setRascunhos] = useState<Record<string, string>>({})
  const [salvos, setSalvos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erroPrazo, setErroPrazo] = useState<string | null>(null)

  const [setores, setSetores] = useState<Setor[]>([])
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const [classificando, setClassificando] = useState<string | null>(null)
  const [erroClassificacao, setErroClassificacao] = useState<string | null>(null)

  const buscar = useCallback(
    () =>
      apiGet<{ pedido: PedidoDetalhado }>(`/api/pedidos/${orderId}`)
        .then((dados) => {
          setPedido(dados.pedido)
          setErro(null)
        })
        .catch((error) => {
          if (error instanceof ApiError && error.status === 404) setErro('nao_encontrado')
          else setErro('falha')
        })
        .finally(() => setCarregando(false)),
    [orderId],
  )

  useEffect(() => {
    void buscar()
  }, [buscar])

  function tentarDeNovo() {
    setCarregando(true)
    void buscar()
  }

  async function salvarPrazo(itemId: string) {
    const prazo = rascunhos[itemId] ?? ''
    setErroPrazo(null)
    if (prazo.trim() === '') {
      setErroPrazo('Informe a data do prazo.')
      return
    }

    setSalvando(itemId)
    try {
      await apiPatch(`/api/pedidos/itens/${itemId}/prazo`, { prazo })
      setSalvos((atual) => ({ ...atual, [itemId]: prazo }))
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setErroPrazo('Item não encontrado.')
      } else {
        setErroPrazo('Não foi possível salvar o prazo. Tente novamente.')
      }
    } finally {
      setSalvando(null)
    }
  }

  useEffect(() => {
    if (!permitirClassificacao) return
    apiGet<{ sectors: Setor[] }>('/api/setores')
      .then((dados) => setSetores(dados.sectors))
      .catch(() => setErroClassificacao('Não foi possível carregar os setores.'))
  }, [permitirClassificacao])

  async function classificar(itemId: string) {
    const sectorId = escolhas[itemId] ?? ''
    setErroClassificacao(null)
    if (sectorId === '') {
      setErroClassificacao('Escolha o setor do item.')
      return
    }

    setClassificando(itemId)
    try {
      await apiPost(`/api/pedidos/itens/${itemId}/classificar`, { sectorId })
      marcarClassificado(itemId)
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        marcarClassificado(itemId)
        setErroClassificacao('O item já estava classificado.')
      } else if (error instanceof ApiError && error.status === 400) {
        setErroClassificacao('Setor inválido. Escolha outro.')
      } else {
        setErroClassificacao('Não foi possível classificar o item. Tente novamente.')
      }
    } finally {
      setClassificando(null)
    }
  }

  function marcarClassificado(itemId: string) {
    setPedido((atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((item) =>
              item.itemId === itemId ? { ...item, classificationStatus: 'CLASSIFIED' } : item,
            ),
          }
        : atual,
    )
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
      <Alert variant="error" title="Pedido não encontrado">
        Verifique o número do pedido e tente novamente.
      </Alert>
    )
  }

  if (erro || !pedido) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar o pedido"
        action={<Button onClick={tentarDeNovo}>Tentar de novo</Button>}
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <Link href={basePath} className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}>
          ← Voltar para os pedidos
        </Link>
        <PageHead
          title={`Pedido ${pedido.numero}`}
          description={pedido.cliente ?? 'Sem cliente'}
          actions={
            pedido.sellerLegacyCode ? (
              <Badge variant="info">Vendedor {pedido.sellerLegacyCode}</Badge>
            ) : null
          }
        />
      </div>

      {erroPrazo ? (
        <Alert variant="error" title="Não foi possível salvar o prazo">
          {erroPrazo}
        </Alert>
      ) : null}

      {erroClassificacao ? (
        <Alert variant="error" title="Não foi possível classificar">
          {erroClassificacao}
        </Alert>
      ) : null}

      {pedido.itens.length === 0 ? (
        <Alert variant="info" title="Pedido sem itens">
          Este pedido não possui itens.
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desmembramento por setor</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 text-sm text-ink">
                {agruparPorSetor(pedido.itens).map((grupo) => (
                  <li key={grupo.setor} className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{grupo.setor}</span>
                    <span className="text-muted">
                      {grupo.itens} item(ns) · solicitado {grupo.solicitado} · pendente {grupo.pendente}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {pedido.itens.map((item, indice) => (
          <Card key={item.itemId}>
            <CardHeader>
              <div className="min-w-0">
                <CardTitle className="text-base">
                  {item.description ?? 'Item sem descrição'}
                </CardTitle>
                <p className="mt-1 text-sm text-muted">
                  Item {indice + 1} · Código {item.productCode ?? '—'} · {item.unit}
                </p>
              </div>
              {item.unit ? <Badge variant="neutral">{item.unit}</Badge> : null}
            </CardHeader>
            <CardContent className="grid gap-4">
              <ul aria-label={`Valores do item ${indice + 1}`} className="grid gap-1 text-sm text-ink">
                <li>Solicitado: {item.solicitado}</li>
                <li>Executado: {item.executado}</li>
                <li>Disponível: {item.disponivel}</li>
                <li>Entregue: {item.entregue}</li>
                <li className="font-semibold">Pendente: {item.pendente}</li>
                <li>Unidade: {item.unit}</li>
              </ul>

              <p className="text-sm text-muted">
                Setor: {item.sectorName ?? 'Não classificado'}
                {item.activityStatus
                  ? ` · ${ROTULO_SITUACAO[item.activityStatus] ?? item.activityStatus}`
                  : ''}
              </p>

              <form
                className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                onSubmit={(evento) => {
                  evento.preventDefault()
                  void salvarPrazo(item.itemId)
                }}
                noValidate
              >
                <Field label={`Prazo do item ${indice + 1}`}>
                  {(props) => (
                    <Input
                      {...props}
                      type="date"
                      value={rascunhos[item.itemId] ?? ''}
                      onChange={(evento) =>
                        setRascunhos((atual) => ({ ...atual, [item.itemId]: evento.target.value }))
                      }
                    />
                  )}
                </Field>
                <Button
                  type="submit"
                  disabled={salvando === item.itemId}
                  aria-label={`Salvar prazo do item ${indice + 1}`}
                >
                  Salvar prazo
                </Button>
              </form>

              {salvos[item.itemId] ? (
                <Badge variant="success">Prazo definido: {salvos[item.itemId]}</Badge>
              ) : null}

              {permitirClassificacao ? (
                <div className="grid gap-3 border-t border-line pt-4">
                  <p className="text-sm font-semibold text-ink">Classificação</p>
                  {item.classificationStatus === 'CLASSIFIED' ? (
                    <Badge variant="success">Item classificado</Badge>
                  ) : (
                    <form
                      className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                      onSubmit={(evento) => {
                        evento.preventDefault()
                        void classificar(item.itemId)
                      }}
                      noValidate
                    >
                      <Field label={`Setor do item ${indice + 1}`}>
                        {(props) => (
                          <select
                            id={props.id}
                            aria-describedby={props['aria-describedby']}
                            className={CLASSE_SELECT}
                            value={escolhas[item.itemId] ?? ''}
                            onChange={(evento) =>
                              setEscolhas((atual) => ({
                                ...atual,
                                [item.itemId]: evento.target.value,
                              }))
                            }
                          >
                            <option value="">Selecione…</option>
                            {setores.map((setor) => (
                              <option key={setor.id} value={setor.id}>
                                {setor.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </Field>
                      <Button
                        type="submit"
                        disabled={classificando === item.itemId}
                        aria-label={`Classificar item ${indice + 1}`}
                      >
                        Classificar
                      </Button>
                    </form>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
          ))}
        </>
      )}
    </section>
  )
}
