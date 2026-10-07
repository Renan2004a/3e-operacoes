'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ApiError, apiGet, apiPatch } from '@/shared/http/api-client'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Field } from './field'
import { Input } from './input'
import { Spinner } from './spinner'

interface ItemSaldo {
  itemId: string
  solicitado: string | number
  executado: string | number
  disponivel: string | number
  entregue: string | number
  pendente: string | number
}

interface PedidoDetalhado {
  id: string
  numero: string
  cliente: string | null
  itens: ItemSaldo[]
}

export interface PedidoDetalheProps {
  orderId: string
  /** Rota da lista, usada no link de voltar. */
  basePath?: string
}

/**
 * Detalhe do pedido com os cinco valores por item e a definição de prazo
 * (FEP-04, FEP-05). Reutilizado pelo gerente e pelo vendedor; o vendedor apenas
 * consulta a produção e define prazo.
 */
export function PedidoDetalhe({ orderId, basePath = '/gerente/pedidos' }: PedidoDetalheProps) {
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<'falha' | 'nao_encontrado' | null>(null)

  const [rascunhos, setRascunhos] = useState<Record<string, string>>({})
  const [salvos, setSalvos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erroPrazo, setErroPrazo] = useState<string | null>(null)

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
      <div>
        <Link href={basePath} className="text-sm font-medium text-accent">
          ← Voltar para os pedidos
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Pedido {pedido.numero}</h1>
        <p className="text-sm text-muted">{pedido.cliente ?? 'Sem cliente'}</p>
      </div>

      {erroPrazo ? (
        <Alert variant="error" title="Não foi possível salvar o prazo">
          {erroPrazo}
        </Alert>
      ) : null}

      {pedido.itens.length === 0 ? (
        <Alert variant="info" title="Pedido sem itens">
          Este pedido não possui itens.
        </Alert>
      ) : (
        pedido.itens.map((item) => (
          <Card key={item.itemId}>
            <CardHeader>
              <CardTitle className="text-base">Item {item.itemId}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <ul aria-label={`Valores do item ${item.itemId}`} className="grid gap-1 text-sm text-ink">
                <li>Solicitado: {item.solicitado}</li>
                <li>Executado: {item.executado}</li>
                <li>Disponível: {item.disponivel}</li>
                <li>Entregue: {item.entregue}</li>
                <li className="font-semibold">Pendente: {item.pendente}</li>
              </ul>

              <form
                className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                onSubmit={(evento) => {
                  evento.preventDefault()
                  void salvarPrazo(item.itemId)
                }}
                noValidate
              >
                <Field label={`Prazo do item ${item.itemId}`}>
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
                  aria-label={`Salvar prazo do item ${item.itemId}`}
                >
                  Salvar prazo
                </Button>
              </form>

              {salvos[item.itemId] ? (
                <Badge variant="success">Prazo definido: {salvos[item.itemId]}</Badge>
              ) : null}
            </CardContent>
          </Card>
        ))
      )}
    </section>
  )
}
