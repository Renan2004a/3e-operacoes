'use client'

import { useCallback, useEffect, useState } from 'react'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Field } from '@/shared/ui/field'
import { Input } from '@/shared/ui/input'
import { Metric } from '@/shared/ui/metric'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'

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

interface PedidoListado {
  id: string
  numero: string
  cliente: string | null
}

const CLASSE_SELECT =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink'

function numero(valor: string | number): number {
  return Number(String(valor).replace(',', '.'))
}

/** Soma um campo numérico dos itens, para o resumo do pedido (PROT-05). */
function somar(itens: ItemSaldo[], campo: 'disponivel' | 'pendente'): number {
  return itens.reduce((total, item) => total + numero(item[campo]), 0)
}

interface EntregaFormProps {
  item: ItemSaldo
  onRegistrada: () => void
}

/**
 * Formulário de entrega de um item (FEP-06, FEP-07). Dentro do disponível
 * registra direto; acima do disponível exige autorização de gerente com motivo.
 */
function EntregaForm({ item, onRegistrada }: EntregaFormProps) {
  const [quantidade, setQuantidade] = useState('')
  const [excecao, setExcecao] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const disponivel = numero(item.disponivel)
  const excede =
    quantidade.trim() !== '' && !Number.isNaN(numero(quantidade)) && numero(quantidade) > disponivel

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    setErro(null)
    setSucesso(false)

    const valor = numero(quantidade)
    if (quantidade.trim() === '' || Number.isNaN(valor) || valor <= 0) {
      setErro('Informe uma quantidade válida.')
      return
    }
    if (valor > disponivel && !excecao) {
      setErro('Entrega acima do disponível exige autorização de gerente com motivo.')
      return
    }
    if (excecao && motivo.trim() === '') {
      setErro('Informe o motivo da exceção.')
      return
    }

    setEnviando(true)
    try {
      await apiPost(`/api/pedidos/itens/${item.itemId}/entregas`, {
        quantidade,
        excecao,
        motivoExcecao: excecao ? motivo : undefined,
      })
      setSucesso(true)
      setQuantidade('')
      setExcecao(false)
      setMotivo('')
      onRegistrada()
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErro('Entrega acima do disponível exige autorização de gerente com motivo.')
      } else if (error instanceof ApiError && error.status === 403) {
        setErro('Apenas o gerente pode autorizar uma entrega acima do disponível.')
      } else {
        setErro('Não foi possível registrar a entrega. Tente novamente.')
      }
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form className="grid gap-3" onSubmit={aoEnviar} noValidate>
      {sucesso ? (
        <Alert variant="success" title="Entrega registrada">
          O saldo foi atualizado.
        </Alert>
      ) : null}

      {erro ? (
        <Alert variant="error" title="Não foi possível registrar a entrega">
          {erro}
        </Alert>
      ) : null}

      <Field label={`Quantidade do item ${item.itemId}`} required>
        {(props) => (
          <Input
            {...props}
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value)}
          />
        )}
      </Field>

      {excede ? (
        <div className="grid gap-3 rounded-lg border border-warning/40 bg-warning-bg p-3">
          <p className="text-sm font-semibold text-warning">
            Quantidade acima do disponível: exige autorização de gerente.
          </p>
          <label className="flex items-center gap-2 text-sm font-medium text-ink">
            <input
              type="checkbox"
              className="h-5 w-5"
              checked={excecao}
              onChange={(evento) => setExcecao(evento.target.checked)}
            />
            Autorizar acima do disponível
          </label>
          <Field label={`Motivo da exceção do item ${item.itemId}`} required>
            {(props) => (
              <Input
                {...props}
                value={motivo}
                onChange={(evento) => setMotivo(evento.target.value)}
              />
            )}
          </Field>
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={enviando}
        aria-label={`Registrar entrega do item ${item.itemId}`}
      >
        {enviando ? 'Registrando…' : 'Registrar entrega'}
      </Button>
    </form>
  )
}

/** Itens disponíveis e registro de entrega da expedição (FEP-06, FEP-07). */
export default function EntregasPage() {
  const [pedidos, setPedidos] = useState<PedidoListado[] | null>(null)
  const [carregandoLista, setCarregandoLista] = useState(true)
  const [erroLista, setErroLista] = useState(false)

  const [orderId, setOrderId] = useState('')
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null)
  const [carregandoPedido, setCarregandoPedido] = useState(false)
  const [erroPedido, setErroPedido] = useState(false)

  const buscarPedidos = useCallback(
    () =>
      apiGet<{ pedidos: PedidoListado[] }>('/api/pedidos')
        .then((dados) => {
          setPedidos(dados.pedidos)
          setErroLista(false)
        })
        .catch(() => setErroLista(true))
        .finally(() => setCarregandoLista(false)),
    [],
  )

  useEffect(() => {
    void buscarPedidos()
  }, [buscarPedidos])

  const carregarPedido = useCallback(
    (id: string) =>
      apiGet<{ pedido: PedidoDetalhado }>(`/api/pedidos/${id}`)
        .then((dados) => {
          setPedido(dados.pedido)
          setErroPedido(false)
        })
        .catch(() => setErroPedido(true))
        .finally(() => setCarregandoPedido(false)),
    [],
  )

  useEffect(() => {
    if (!orderId) return
    void carregarPedido(orderId)
  }, [orderId, carregarPedido])

  if (carregandoLista) {
    return (
      <div className="p-2">
        <Spinner />
      </div>
    )
  }

  if (erroLista) {
    return (
      <Alert
        variant="error"
        title="Não foi possível carregar os pedidos"
        action={
          <Button
            onClick={() => {
              setCarregandoLista(true)
              void buscarPedidos()
            }}
          >
            Tentar de novo
          </Button>
        }
      >
        Verifique sua conexão e tente novamente.
      </Alert>
    )
  }

  return (
    <section className="grid gap-4">
      <PageHead title="Entregas" description="Itens disponíveis e registro de entrega." />

      <Field label="Pedido">
        {(props) => (
          <select
            id={props.id}
            aria-describedby={props['aria-describedby']}
            className={CLASSE_SELECT}
            value={orderId}
            onChange={(evento) => {
              setOrderId(evento.target.value)
              setCarregandoPedido(evento.target.value !== '')
            }}
          >
            <option value="">Selecione…</option>
            {(pedidos ?? []).map((opcao) => (
              <option key={opcao.id} value={opcao.id}>
                Pedido {opcao.numero}
              </option>
            ))}
          </select>
        )}
      </Field>

      {carregandoPedido ? <Spinner /> : null}

      {erroPedido ? (
        <Alert variant="error" title="Não foi possível carregar o pedido">
          Verifique sua conexão e tente novamente.
        </Alert>
      ) : null}

      {!carregandoPedido && pedido ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Itens" value={pedido.itens.length} helper="No pedido." />
            <Metric
              label="Disponíveis"
              value={somar(pedido.itens, 'disponivel')}
              tone="success"
              helper="Para entrega."
            />
            <Metric
              label="Pendentes"
              value={somar(pedido.itens, 'pendente')}
              helper="A produzir."
            />
          </div>

          {pedido.itens.map((item) => (
            <Card key={item.itemId}>
              <CardHeader>
                <div>
                  <CardTitle className="text-base">Item {item.itemId}</CardTitle>
                  <p className="mt-1 text-sm text-ink">Disponível: {item.disponivel}</p>
                </div>
                <Badge variant={numero(item.disponivel) > 0 ? 'success' : 'neutral'}>
                  {numero(item.disponivel) > 0 ? 'Disponível' : 'Sem saldo'}
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm text-muted">
                  Solicitado: {item.solicitado} · Executado: {item.executado} · Entregue:{' '}
                  {item.entregue} · Pendente: {item.pendente}
                </p>
                <EntregaForm item={item} onRegistrada={() => void carregarPedido(orderId)} />
              </CardContent>
            </Card>
          ))}
        </>
      ) : null}
    </section>
  )
}
