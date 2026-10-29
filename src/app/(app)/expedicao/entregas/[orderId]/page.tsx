'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { unidadeUsaCasasDecimais } from '@/modules/producao/unidade-medida'
import { ApiError, apiGet, apiPost } from '@/shared/http/api-client'
import { Alert } from '@/shared/ui/alert'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Field } from '@/shared/ui/field'
import { HistoricoEntregas } from '@/shared/ui/historico-entregas'
import { Input } from '@/shared/ui/input'
import { Metric } from '@/shared/ui/metric'
import { PageHead } from '@/shared/ui/page-head'
import { Spinner } from '@/shared/ui/spinner'
import { resolverRetornoListagem } from '@/shared/ui/retorno-lista'
import { cn, FOCO_VISIVEL } from '@/shared/ui/utils'
import { formatarDiaCivil } from '@/shared/time/dia-civil'
import { formatarQuantidadeParaExibicao, valorPorUnidade, type TotalUnidadeView } from '@/shared/ui/totais-unidade'
import { situacaoDoItem } from './situacao-item'

interface ItemSaldo {
  itemId: string
  unit: string
  /** Descrição e código do produto, para o expedidor conferir o item. */
  description?: string | null
  productCode?: string | null
  /** Previsão de entrega do item (ISO), quando o gerente definiu. */
  deadlineAt?: string | null
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
  totaisPorUnidade: TotalUnidadeView[]
}

function numero(valor: string | number): number {
  return Number(String(valor).replace(',', '.'))
}

/** Evita ruído de ponto flutuante (0,1 + 0,2) nos totais mostrados na confirmação. */
function arredondar(valor: number): number {
  return Number(valor.toFixed(2))
}

/**
 * Mensagem por causa do erro, dizendo o que aconteceu e o que fazer (H9). O 409
 * só ocorre aqui quando o saldo mudou depois de a tela abrir: a própria tela já
 * barra o excedente sem autorização antes de enviar.
 */
function mensagemDeErro(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return 'Não foi possível registrar a entrega. Tente novamente.'
  }
  if (error.status === 0) {
    return 'Sem conexão com o servidor. Confira se a entrega já aparece no saldo antes de tentar de novo.'
  }
  if (error.status === 401) return 'Sua sessão expirou. Entre novamente.'
  if (error.status === 403) return 'Apenas o gerente pode autorizar uma entrega acima do disponível.'
  if (error.status === 404) return 'Este item não foi encontrado. Atualize a página e tente de novo.'
  if (error.status === 409) {
    return 'O saldo disponível mudou desde que a tela foi aberta. Atualizamos os valores: confira a quantidade e tente de novo.'
  }
  if (error.code === 'invalid_quantity') {
    return 'A quantidade não é válida para esta unidade. Use número inteiro para peças e até 2 casas decimais para metros.'
  }
  if (error.code === 'override_reason_required') return 'Informe o motivo da exceção.'
  return 'Não foi possível registrar a entrega. Tente novamente.'
}

interface EntregaFormProps {
  item: ItemSaldo
  /** Rótulo humano do item na tela (posição), no lugar do CUID. */
  rotulo: string
  /** O perfil atual pode autorizar entrega acima do disponível. */
  podeAutorizar: boolean
  onRegistrada: () => void
  /** O servidor recusou por saldo diferente do exibido: recarrega o pedido. */
  onSaldoMudou: () => void
}

/**
 * Formulário de entrega de um item (FEP-06, FEP-07). A entrega não pode ser
 * desfeita, então o envio passa por uma janela de confirmação com o resumo.
 * Acima do disponível exige autorização de gerente com motivo, e a janela vira
 * um aviso reforçado de que a exceção será auditada.
 */
function EntregaForm({ item, rotulo, podeAutorizar, onRegistrada, onSaldoMudou }: EntregaFormProps) {
  const [quantidade, setQuantidade] = useState('')
  const [excecao, setExcecao] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)

  const disponivel = numero(item.disponivel)
  const excede =
    quantidade.trim() !== '' && !Number.isNaN(numero(quantidade)) && numero(quantidade) > disponivel

  function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
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

    setConfirmando(true)
  }

  async function aoConfirmar() {
    setEnviando(true)
    try {
      await apiPost(`/api/pedidos/itens/${item.itemId}/entregas`, {
        quantidade,
        excecao,
        motivoExcecao: excecao ? motivo : undefined,
      })
      setConfirmando(false)
      setSucesso(true)
      setQuantidade('')
      setExcecao(false)
      setMotivo('')
      onRegistrada()
    } catch (error) {
      setConfirmando(false)
      setErro(mensagemDeErro(error))
      if (error instanceof ApiError && error.status === 409) onSaldoMudou()
    } finally {
      setEnviando(false)
    }
  }

  const casasDecimais = item.unit ? unidadeUsaCasasDecimais(item.unit) : false
  const valor = numero(quantidade)
  const exibir = (v: number) => formatarQuantidadeParaExibicao(item.unit ?? null, String(arredondar(v)))
  const concluiItem = numero(item.entregue) + valor >= numero(item.executado)

  return (
    <>
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

      <Field
        label={`Quantidade do ${rotulo}`}
        required
        hint={
          disponivel > 0
            ? `Pode entregar até ${exibir(disponivel)}${item.unit ? ` ${item.unit}` : ''}. ${casasDecimais ? 'Até 2 casas decimais.' : 'Use número inteiro.'}`
            : 'Sem saldo disponível: a entrega exige autorização do gerente.'
        }
      >
        {(props) => (
          <Input
            {...props}
            type="number"
            inputMode={casasDecimais ? 'decimal' : 'numeric'}
            min="0"
            step={casasDecimais ? '0.01' : '1'}
            value={quantidade}
            onChange={(evento) => setQuantidade(evento.target.value)}
            onWheel={(evento) => evento.currentTarget.blur()}
          />
        )}
      </Field>

      {disponivel > 0 ? (
        <Button
          variant="outline"
          disabled={enviando}
          aria-label={`Entregar tudo (${exibir(disponivel)}) do ${rotulo}`}
          onClick={() => {
            setQuantidade(String(arredondar(disponivel)))
            setExcecao(false)
            setErro(null)
            setSucesso(false)
            setConfirmando(true)
          }}
        >
          Entregar tudo ({exibir(disponivel)})
        </Button>
      ) : null}

      {excede ? (
        <div className="grid gap-3 rounded-lg border border-warning/40 bg-warning-bg p-3">
          <p className="text-sm font-semibold text-warning">
            Quantidade acima do disponível: exige autorização de gerente.
          </p>
          {podeAutorizar ? (
            <>
              <label className="flex items-center gap-2 text-sm font-medium text-ink">
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={excecao}
                  onChange={(evento) => setExcecao(evento.target.checked)}
                />
                Autorizar acima do disponível
              </label>
              <Field label={`Motivo da exceção do ${rotulo}`} required>
                {(props) => (
                  <Input
                    {...props}
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                  />
                )}
              </Field>
            </>
          ) : (
            <p className="text-sm text-warning">
              Peça ao gerente de produção para registrar a entrega com autorização e motivo.
            </p>
          )}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={enviando || (excede && (!podeAutorizar || !excecao))}
        aria-label={`Registrar entrega do ${rotulo}`}
      >
        {enviando ? 'Registrando…' : 'Registrar entrega'}
      </Button>
    </form>

    <ConfirmDialog
      open={confirmando}
      variant={excecao ? 'warning' : 'default'}
      title={excecao ? 'Confirmar entrega acima do disponível?' : 'Confirmar a entrega?'}
      confirmLabel="Confirmar entrega"
      busy={enviando}
      busyLabel="Registrando…"
      onConfirm={() => void aoConfirmar()}
      onCancel={() => setConfirmando(false)}
    >
      <p>
        Você vai entregar <strong>{exibir(valor)}</strong> do {rotulo}.
      </p>
      {excecao ? (
        <>
          <p>
            São {exibir(valor - disponivel)} acima do disponível ({exibir(disponivel)}).
          </p>
          <p>Motivo: {motivo.trim()}</p>
          <p className="font-semibold text-warning">
            Esta exceção ficará registrada na auditoria, com o seu usuário, o valor e a data.
          </p>
        </>
      ) : (
        <>
          <p>Disponível agora: {exibir(disponivel)}</p>
          <p>
            {disponivel - valor > 0
              ? `Depois da entrega sobram ${exibir(disponivel - valor)} disponíveis.`
              : 'Depois da entrega não sobra nada disponível.'}
          </p>
          <p>{concluiItem ? 'Esta entrega conclui o item.' : 'O item continua com entrega parcial.'}</p>
        </>
      )}
      <p className="text-muted">Não é possível desfazer uma entrega registrada.</p>
    </ConfirmDialog>
    </>
  )
}

/**
 * Itens disponíveis e registro de entrega de um pedido (FEP-06, FEP-07). Rota
 * própria, como no vendedor: o pedido é aberto pela lista e o "Voltar" devolve
 * a lista com a busca e a página de onde veio.
 */
export default function EntregasPedidoPage() {
  const params = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()
  const orderId = params.orderId
  const destinoVoltar = resolverRetornoListagem(searchParams.get('retorno'), '/expedicao/entregas')

  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null)
  const [carregandoPedido, setCarregandoPedido] = useState(true)
  const [erroPedido, setErroPedido] = useState(false)
  const [podeAutorizar, setPodeAutorizar] = useState(false)

  useEffect(() => {
    // A exceção acima do disponível é exclusiva do gerente de produção.
    apiGet<{ usuario: { roles: string[] } }>('/api/auth/sessao')
      .then((dados) => setPodeAutorizar(dados.usuario.roles.includes('PRODUCTION_MANAGER')))
      .catch(() => setPodeAutorizar(false))
  }, [])

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
    void carregarPedido(orderId)
  }, [orderId, carregarPedido])

  return (
    <section className="grid gap-4">
      {/* Navegação completa de propósito, como no detalhe do vendedor: o retorno
          carrega a lista com a busca e a página de origem. */}
      <a href={destinoVoltar} className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}>
        ← Voltar para os pedidos
      </a>

      <PageHead
        title={pedido ? `Pedido ${pedido.numero}` : 'Entregas'}
        description={
          pedido?.cliente
            ? `Cliente ${pedido.cliente} · itens disponíveis e registro de entrega.`
            : 'Itens disponíveis e registro de entrega.'
        }
      />

      {carregandoPedido ? <Spinner /> : null}

      {erroPedido ? (
        <Alert
          variant="error"
          title="Não foi possível carregar o pedido"
          action={
            <Button
              onClick={() => {
                setCarregandoPedido(true)
                void carregarPedido(orderId)
              }}
            >
              Tentar de novo
            </Button>
          }
        >
          Verifique sua conexão e tente novamente.
        </Alert>
      ) : null}

      {!carregandoPedido && pedido ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Metric label="Itens" value={pedido.itens.length} helper="No pedido." />
            <Metric
              label="Disponíveis"
              value={valorPorUnidade(pedido.totaisPorUnidade, 'disponivel')}
              tone="success"
              helper="Para entrega, por unidade."
            />
            <Metric
              label="Pendentes"
              value={valorPorUnidade(pedido.totaisPorUnidade, 'pendente')}
              helper="A produzir, por unidade."
            />
          </div>

          {pedido.itens.map((item, indice) => {
            const situacao = situacaoDoItem({
              solicitado: numero(item.solicitado),
              disponivel: numero(item.disponivel),
              entregue: numero(item.entregue),
              pendente: numero(item.pendente),
            })
            const semSaldo = numero(item.disponivel) <= 0
            return (
            <Card key={item.itemId}>
              <CardHeader>
                <div className="min-w-0">
                  <CardTitle className="text-base break-words">
                    {item.description ?? `Item ${indice + 1} sem descrição`}
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Item {indice + 1}
                    {item.productCode ? ` · Código ${item.productCode}` : ''}
                  </p>
                  <p className="mt-1 text-sm text-ink">
                    Disponível: {formatarQuantidadeParaExibicao(item.unit ?? null, item.disponivel)}
                  </p>
                  <p className="text-sm text-muted">
                    Previsão de entrega:{' '}
                    {item.deadlineAt ? formatarDiaCivil(item.deadlineAt) : 'Sem previsão'}
                  </p>
                </div>
                <Badge variant={situacao.variante}>{situacao.rotulo}</Badge>
              </CardHeader>
              <CardContent className="grid gap-4">
                <p className="text-sm text-muted">
                  Solicitado: {formatarQuantidadeParaExibicao(item.unit ?? null, item.solicitado)} · Executado:{' '}
                  {formatarQuantidadeParaExibicao(item.unit ?? null, item.executado)} · Entregue:{' '}
                  {formatarQuantidadeParaExibicao(item.unit ?? null, item.entregue)} · Pendente:{' '}
                  {formatarQuantidadeParaExibicao(item.unit ?? null, item.pendente)}
                </p>
                {semSaldo ? (
                  <Alert
                    variant="info"
                    title={
                      situacao.codigo === 'ENTREGUE'
                        ? 'Item totalmente entregue'
                        : 'Aguardando produção'
                    }
                  >
                    {situacao.codigo === 'ENTREGUE'
                      ? `Todo o solicitado (${formatarQuantidadeParaExibicao(item.unit ?? null, item.solicitado)}) já foi entregue. Não há mais nada para registrar.`
                      : numero(item.entregue) > 0
                        ? `Tudo o que já foi produzido foi entregue. Faltam ${formatarQuantidadeParaExibicao(item.unit ?? null, item.pendente)} a produzir.`
                        : `Este item ainda não tem saldo disponível para entrega. A entrega poderá ser registrada quando a produção avançar.${podeAutorizar ? '' : ' Acima do disponível, apenas o gerente autoriza.'}`}
                  </Alert>
                ) : null}
                {!semSaldo || podeAutorizar ? (
                  <EntregaForm
                    item={item}
                    rotulo={`item ${indice + 1}`}
                    podeAutorizar={podeAutorizar}
                    onRegistrada={() => void carregarPedido(orderId)}
                    onSaldoMudou={() => void carregarPedido(orderId)}
                  />
                ) : null}
                <HistoricoEntregas
                  itemId={item.itemId}
                  unidade={item.unit ?? null}
                  atualizarQuando={String(item.entregue)}
                />
              </CardContent>
            </Card>
            )
          })}
        </>
      ) : null}
    </section>
  )
}
