'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import type { RoleCode } from '@/generated/prisma/client'
import {
  contarCaracteresMotivo,
  LIMITE_MOTIVO_CORRECAO,
  normalizarMotivoCorrecao,
  validarMotivoCorrecao,
  type ErroMotivoCorrecao,
} from '@/modules/setores/motivo-correcao'
import { calcularStatusPrazo } from '@/modules/prazos/atraso'
import { chaveUnidade } from '@/modules/producao/unidade-medida'
import { pode } from '@/modules/usuarios/permissoes'
import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from '@/shared/http/api-client'
import { diaCivilParaInput, formatarDiaCivil } from '@/shared/time/dia-civil'
import { Alert } from './alert'
import { Badge } from './badge'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Field } from './field'
import { Input } from './input'
import { Metric } from './metric'
import { PageHead } from './page-head'
import { Progress, type ProgressTone } from './progress'
import { resolverRetornoListagem } from './retorno-lista'
import { Spinner } from './spinner'
import {
  agruparPorSetor,
  formatarQuantidadeParaExibicao,
  rotuloDaUnidade,
  valorPorUnidade,
  type TotalUnidadeView,
} from './totais-unidade'
import {
  ehRevenda,
  participioExecucao,
  rotuloExecucao,
  rotuloExecutado,
  rotuloSituacaoDoSetor,
  vocabularioDoSetor,
  type VocabularioSetor,
} from './vocabulario-setor'
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
  /** Prazo de entrega do item, ou null quando não definido (AD-009). */
  deadlineAt?: string | null
  /** Prazo operacional da atividade do setor, ou null quando não definido (AD-009). */
  activityDeadlineAt?: string | null
  classificationStatus: 'CLASSIFIED' | 'PENDING_CLASSIFICATION'
  sectorId?: string | null
  sectorCode?: string | null
  sectorName?: string | null
  activityStatus?: string | null
  suggestedSectorId?: string | null
  bloqueioCorrecaoSetor?: string | null
  remessas?: Remessa[]
}

/** Remessa (entrega programada) de um item. */
interface Remessa {
  id: string
  remessa: number
  scheduledAt: string
  confirmedAt: string | null
}

function formatarDataRemessa(valor: string): string {
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) return valor
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data)
}

interface Setor {
  id: string
  code: string
  name: string
  active: boolean
}

const CLASSE_SELECT =
  'min-h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-ink'

const MENSAGEM_MOTIVO_CORRECAO: Record<ErroMotivoCorrecao, string> = {
  reason_required: 'Informe o motivo da correção.',
  reason_too_long: `O motivo deve ter no máximo ${LIMITE_MOTIVO_CORRECAO} caracteres.`,
}

/** Mensagem para a resposta de erro da correção de setor (AD-007). */
function mensagemErroCorrecao(codigo: string): string {
  switch (codigo) {
    case 'operational_records':
      return 'O item já possui registros operacionais e não pode mudar de setor.'
    case 'item_not_classified':
      return 'O item ainda não foi desmembrado. Use o desmembramento inicial.'
    case 'reason_required':
      return MENSAGEM_MOTIVO_CORRECAO.reason_required
    case 'reason_too_long':
      return MENSAGEM_MOTIVO_CORRECAO.reason_too_long
    case 'invalid_sector':
      return 'Setor inválido ou inativo. Escolha outro setor e tente novamente.'
    case 'forbidden':
      return 'Seu perfil não pode corrigir o setor deste item.'
    case 'item_not_found':
      return 'Item não encontrado. Atualize a página e tente novamente.'
    default:
      return 'Não foi possível corrigir o setor. Tente novamente.'
  }
}

/**
 * Vocabulário de um total por unidade. Como o total agrega setores, só é
 * separação quando todos os itens daquela unidade são de Revenda; se houver
 * produção misturada, preserva o vocabulário de produção.
 */
function vocabularioDoTotal(
  total: TotalUnidadeView,
  itens: readonly ItemSaldo[],
): VocabularioSetor {
  const chave = chaveUnidade(total.unidade ?? '')
  const doGrupo = itens.filter((item) => chaveUnidade(item.unit) === chave)
  if (doGrupo.length === 0) return 'producao'
  return doGrupo.every((item) => ehRevenda(item.sectorCode, item.sectorName))
    ? 'separacao'
    : 'producao'
}

function numero(valor: string | number): number {
  return Number(String(valor).replace(',', '.'))
}

/** Percentual executado de um item ou de um grupo da mesma unidade, limitado a 100. */
function percentualExecutado(valores: Pick<ItemSaldo, 'solicitado' | 'executado'>): number {
  const solicitado = numero(valores.solicitado)
  const executado = numero(valores.executado)
  if (!Number.isFinite(solicitado) || solicitado <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((executado / solicitado) * 100)))
}

/** Cor do progresso conforme o estado real da atividade (nunca só por cor). */
function tomDoProgresso(item: ItemSaldo, percentual: number): ProgressTone {
  if (item.activityStatus === 'DIVERGENT') return 'danger'
  if (item.activityStatus === 'PAUSED') return 'warning'
  if (item.activityStatus === 'COMPLETED' || percentual >= 100) return 'success'
  return 'accent'
}

interface PedidoDetalhado {
  id: string
  numero: string
  cliente: string | null
  customerName: string | null
  sellerLegacyCode: string | null
  itens: ItemSaldo[]
  totaisPorUnidade: TotalUnidadeView[]
}

export interface PedidoDetalheProps {
  orderId: string
  /** Rota da lista, usada no link de voltar. */
  basePath?: string
  /**
   * Contexto da listagem de origem (caminho + query), recebido da URL do
   * detalhe. É validado contra `basePath` antes de compor o link de voltar.
   */
  retorno?: string | null
  /** Habilita a classificação manual dos itens pendentes (LAC-04, LAC-05, LAC-06). */
  permitirClassificacao?: boolean
}

/**
 * Detalhe do pedido com os cinco valores por item, prazo, desmembramento e
 * remessas (FEP-04, FEP-05, LAC-04). A ordem prioriza identificação → prazo e
 * quantidades → desmembramento → remessas, com feedback em cada ação.
 */
export function PedidoDetalhe({
  orderId,
  basePath = '/gerente/pedidos',
  retorno = null,
  permitirClassificacao = false,
}: PedidoDetalheProps) {
  const [pedido, setPedido] = useState<PedidoDetalhado | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<'falha' | 'nao_encontrado' | null>(null)

  const [rascunhos, setRascunhos] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState<string | null>(null)

  const [setores, setSetores] = useState<Setor[]>([])
  const [escolhas, setEscolhas] = useState<Record<string, string>>({})
  const [classificando, setClassificando] = useState<string | null>(null)
  const [classificados, setClassificados] = useState<Record<string, boolean>>({})

  const [remessaAberta, setRemessaAberta] = useState<Record<string, boolean>>({})
  const [remessaNumero, setRemessaNumero] = useState<Record<string, string>>({})
  const [remessaData, setRemessaData] = useState<Record<string, string>>({})
  const [remessaSalvando, setRemessaSalvando] = useState<string | null>(null)
  const [remessaProcessando, setRemessaProcessando] = useState<
    Record<string, 'confirmar' | 'remover'>
  >({})
  const [remessaParaExcluir, setRemessaParaExcluir] = useState<{
    id: string
    itemId: string
  } | null>(null)
  const operacoesRemessaRef = useRef(new Set<string>())
  const removerRemessaRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const cancelarExclusaoRef = useRef<HTMLButtonElement | null>(null)
  const focoRemoverRef = useRef<string | null>(null)

  const [perfis, setPerfis] = useState<RoleCode[]>([])
  const [correcaoAberta, setCorrecaoAberta] = useState<Record<string, boolean>>({})
  const [itensAbertos, setItensAbertos] = useState<Record<string, boolean>>({})
  const [correcaoSetor, setCorrecaoSetor] = useState<Record<string, string>>({})
  const [correcaoMotivo, setCorrecaoMotivo] = useState<Record<string, string>>({})
  const [correcaoErro, setCorrecaoErro] = useState<Record<string, string>>({})
  const [corrigindo, setCorrigindo] = useState<string | null>(null)

  const [sucesso, setSucesso] = useState<string | null>(null)
  const [erroAcao, setErroAcao] = useState<string | null>(null)

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

  // Ao abrir a confirmação, foca a ação menos destrutiva; ao fechar, devolve o
  // foco ao botão que iniciou a exclusão (quando ele ainda existe).
  useEffect(() => {
    if (remessaParaExcluir) {
      cancelarExclusaoRef.current?.focus()
      return
    }
    const id = focoRemoverRef.current
    if (id === null) return
    focoRemoverRef.current = null
    removerRemessaRefs.current[id]?.focus()
  }, [remessaParaExcluir])

  useEffect(() => {
    let ativo = true
    async function carregarPerfis() {
      try {
        const dados = await apiGet<{ usuario: { roles: RoleCode[] } }>('/api/auth/sessao')
        if (ativo) setPerfis(dados.usuario.roles)
      } catch {
        if (ativo) setPerfis([])
      }
    }
    void carregarPerfis()
    return () => {
      ativo = false
    }
  }, [])

  function tentarDeNovo() {
    setCarregando(true)
    void buscar()
  }

  function limparFeedback() {
    setSucesso(null)
    setErroAcao(null)
  }

  async function salvarPrazo(itemId: string) {
    const prazo = rascunhos[itemId] ?? ''
    limparFeedback()
    if (prazo.trim() === '') {
      setErroAcao('Informe a data do prazo.')
      return
    }

    setSalvando(itemId)
    try {
      const resposta = await apiPatch<{ item: { id: string; deadlineAt: string } }>(
        `/api/pedidos/itens/${itemId}/prazo`,
        { prazo },
      )
      // A fonte de verdade é a resposta da API: o item passa a exibir o prazo
      // persistido, não o texto digitado (AD-009). Ao limpar o rascunho, o
      // input volta a refletir `item.deadlineAt` após qualquer recarregamento.
      setPedido((atual) =>
        atual
          ? {
              ...atual,
              itens: atual.itens.map((item) =>
                item.itemId === itemId ? { ...item, deadlineAt: resposta.item.deadlineAt } : item,
              ),
            }
          : atual,
      )
      setRascunhos((atual) => {
        const copia = { ...atual }
        delete copia[itemId]
        return copia
      })
      setSucesso('Prazo atualizado com sucesso.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setErroAcao('Item não encontrado. Atualize a página e tente novamente.')
      } else if (error instanceof ApiError && error.status === 400) {
        setErroAcao('Informe uma data válida para o prazo.')
      } else {
        setErroAcao('Não foi possível salvar o prazo. Verifique sua conexão e tente novamente.')
      }
    } finally {
      setSalvando(null)
    }
  }

  useEffect(() => {
    if (!permitirClassificacao) return
    apiGet<{ sectors: Setor[] }>('/api/setores')
      .then((dados) => setSetores(dados.sectors))
      .catch(() => setErroAcao('Não foi possível carregar os setores.'))
  }, [permitirClassificacao])

  async function classificar(itemId: string) {
    const sectorId = escolhas[itemId] ?? ''
    limparFeedback()
    if (sectorId === '') {
      setErroAcao('Escolha o setor do item antes de desmembrar.')
      return
    }

    setClassificando(itemId)
    try {
      await apiPost(`/api/pedidos/itens/${itemId}/classificar`, { sectorId })
      marcarClassificado(itemId)
      setClassificados((atual) => ({ ...atual, [itemId]: true }))
      setSucesso('Item desmembrado com sucesso.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        marcarClassificado(itemId)
        setClassificados((atual) => ({ ...atual, [itemId]: true }))
        setSucesso('O item já estava desmembrado.')
      } else if (error instanceof ApiError && error.status === 400) {
        setErroAcao('Setor inválido. Escolha outro setor e tente novamente.')
      } else {
        setErroAcao('Não foi possível desmembrar o item. Tente novamente.')
      }
    } finally {
      setClassificando(null)
    }
  }

  function marcarClassificado(itemId: string) {
    const setor = setores.find((s) => s.id === (escolhas[itemId] ?? ''))
    setPedido((atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((item) =>
              item.itemId === itemId
                ? {
                    ...item,
                    classificationStatus: 'CLASSIFIED',
                    sectorId: setor?.id ?? item.sectorId ?? null,
                    sectorCode: setor?.code ?? item.sectorCode ?? null,
                    sectorName: setor?.name ?? item.sectorName ?? null,
                  }
                : item,
            ),
          }
        : atual,
    )
  }

  function atualizarRemessas(itemId: string, transformar: (remessas: Remessa[]) => Remessa[]) {
    setPedido((atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((item) =>
              item.itemId === itemId
                ? { ...item, remessas: transformar(item.remessas ?? []) }
                : item,
            ),
          }
        : atual,
    )
  }

  async function programarRemessa(itemId: string) {
    const numeroRemessa = Number(remessaNumero[itemId] ?? '')
    const data = remessaData[itemId] ?? ''
    limparFeedback()

    if (!Number.isInteger(numeroRemessa) || numeroRemessa <= 0) {
      setErroAcao('Informe o número da remessa (1, 2, 3…).')
      return
    }
    if (data.trim() === '') {
      setErroAcao('Informe a data prevista da remessa.')
      return
    }

    setRemessaSalvando(itemId)
    try {
      const resposta = await apiPost<{ remessa: Remessa }>(
        `/api/pedidos/itens/${itemId}/remessas`,
        { remessa: numeroRemessa, scheduledAt: data },
      )
      atualizarRemessas(itemId, (remessas) =>
        [...remessas, resposta.remessa].sort((a, b) => a.remessa - b.remessa),
      )
      setRemessaNumero((atual) => ({ ...atual, [itemId]: '' }))
      setRemessaData((atual) => ({ ...atual, [itemId]: '' }))
      setRemessaAberta((atual) => ({ ...atual, [itemId]: false }))
      setSucesso('Remessa criada com sucesso.')
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setErroAcao('Essa remessa já está programada para o item.')
      } else if (error instanceof ApiError && error.status === 400) {
        setErroAcao('Número ou data da remessa inválidos.')
      } else {
        setErroAcao('Não foi possível programar a remessa. Tente novamente.')
      }
    } finally {
      setRemessaSalvando(null)
    }
  }

  function iniciarOperacaoRemessa(id: string, acao: 'confirmar' | 'remover'): boolean {
    // Guarda síncrona: o estado do React só atualiza após a renderização, então
    // dois cliques rápidos precisam ser barrados por uma referência imediata.
    if (operacoesRemessaRef.current.has(id)) return false
    operacoesRemessaRef.current.add(id)
    setRemessaProcessando((atual) => ({ ...atual, [id]: acao }))
    return true
  }

  function finalizarOperacaoRemessa(id: string) {
    operacoesRemessaRef.current.delete(id)
    setRemessaProcessando((atual) => {
      const proximo = { ...atual }
      delete proximo[id]
      return proximo
    })
  }

  async function confirmarRemessa(id: string, itemId: string) {
    if (!iniciarOperacaoRemessa(id, 'confirmar')) return
    limparFeedback()
    try {
      const resposta = await apiPatch<{ remessa: Remessa }>(`/api/pedidos/remessas/${id}`, {})
      atualizarRemessas(itemId, (remessas) =>
        remessas.map((remessa) => (remessa.id === id ? resposta.remessa : remessa)),
      )
      setSucesso('Remessa confirmada.')
    } catch {
      setErroAcao('Não foi possível confirmar a remessa. Tente novamente.')
    } finally {
      finalizarOperacaoRemessa(id)
    }
  }

  function solicitarExclusaoRemessa(remessa: Remessa, itemId: string) {
    if (operacoesRemessaRef.current.has(remessa.id)) return
    limparFeedback()
    focoRemoverRef.current = remessa.id
    setRemessaParaExcluir({
      id: remessa.id,
      itemId,
    })
  }

  function cancelarExclusaoRemessa() {
    if (remessaParaExcluir && operacoesRemessaRef.current.has(remessaParaExcluir.id)) return
    setRemessaParaExcluir(null)
  }

  async function excluirRemessa() {
    const alvo = remessaParaExcluir
    if (!alvo || !iniciarOperacaoRemessa(alvo.id, 'remover')) return
    limparFeedback()
    try {
      await apiDelete(`/api/pedidos/remessas/${alvo.id}`)
      atualizarRemessas(alvo.itemId, (remessas) =>
        remessas.filter((remessa) => remessa.id !== alvo.id),
      )
      setRemessaParaExcluir(null)
      setSucesso('Remessa excluída.')
    } catch {
      // Mantém a remessa e a confirmação na tela para permitir nova tentativa.
      setErroAcao('Não foi possível excluir a remessa. Tente novamente.')
    } finally {
      finalizarOperacaoRemessa(alvo.id)
    }
  }

  function marcarSetor(itemId: string, sectorId: string) {
    const setor = setores.find((s) => s.id === sectorId)
    setPedido((atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((item) =>
              item.itemId === itemId
                ? {
                    ...item,
                    sectorId,
                    sectorCode: setor?.code ?? item.sectorCode ?? null,
                    sectorName: setor?.name ?? item.sectorName ?? null,
                  }
                : item,
            ),
          }
        : atual,
    )
  }

  async function corrigirSetor(item: ItemSaldo) {
    const { itemId } = item
    const sectorId = correcaoSetor[itemId] ?? ''
    const motivoDigitado = correcaoMotivo[itemId] ?? ''
    limparFeedback()
    setCorrecaoErro((atual) => ({ ...atual, [itemId]: '' }))

    if (sectorId === '') {
      setCorrecaoErro((atual) => ({ ...atual, [itemId]: 'Escolha o novo setor do item.' }))
      return
    }
    if (sectorId === item.sectorId) {
      setCorrecaoErro((atual) => ({
        ...atual,
        [itemId]: 'Escolha um setor diferente do setor atual.',
      }))
      return
    }
    const erroMotivo = validarMotivoCorrecao(motivoDigitado, exigeJustificativaCorrecao)
    if (erroMotivo) {
      setCorrecaoErro((atual) => ({ ...atual, [itemId]: MENSAGEM_MOTIVO_CORRECAO[erroMotivo] }))
      return
    }

    setCorrigindo(itemId)
    try {
      await apiPatch(`/api/pedidos/itens/${itemId}/setor`, {
        sectorId,
        motivo: exigeJustificativaCorrecao ? normalizarMotivoCorrecao(motivoDigitado) : null,
      })
      marcarSetor(itemId, sectorId)
      setCorrecaoAberta((atual) => ({ ...atual, [itemId]: false }))
      setCorrecaoMotivo((atual) => ({ ...atual, [itemId]: '' }))
      setSucesso('Setor corrigido com sucesso.')
    } catch (error) {
      const codigo = error instanceof ApiError ? error.code : ''
      if (codigo === 'operational_records' || codigo === 'item_not_classified') void buscar()
      setErroAcao(mensagemErroCorrecao(codigo))
    } finally {
      setCorrigindo(null)
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

  const pendentesDesmembramento = pedido.itens.filter(
    (item) => item.classificationStatus !== 'CLASSIFIED' && !classificados[item.itemId],
  ).length
  const podeCorrigirSetor = pode(perfis, 'corrigir_setor')
  const exigeJustificativaCorrecao = pode(perfis, 'corrigir_setor_justificado')
  // Enquanto os perfis não carregaram, o formulário continua visível; o
  // servidor é a autoridade. A ação só desaparece quando sabemos que o perfil
  // não pode definir prazo (D9).
  const semPermissaoParaPrazo = perfis.length > 0 && !pode(perfis, 'definir_prazo')
  const destinoVoltar = resolverRetornoListagem(retorno, basePath)

  // O primeiro item abre por padrão; os demais ficam recolhidos para encurtar a
  // página (P10 da avaliação do Gerente).
  const itensDoPedido = pedido.itens
  const itemEstaAberto = (itemId: string, indice: number) =>
    itensAbertos[itemId] ?? indice === 0
  const todosItensAbertos = itensDoPedido.every((item, indice) =>
    itemEstaAberto(item.itemId, indice),
  )

  function alternarTodosItens() {
    const proximo = !todosItensAbertos
    const estado: Record<string, boolean> = {}
    for (const item of itensDoPedido) estado[item.itemId] = proximo
    setItensAbertos(estado)
  }

  const temRevenda = pedido.itens.some((item) => ehRevenda(item.sectorCode, item.sectorName))
  const temProducao = pedido.itens.some((item) => !ehRevenda(item.sectorCode, item.sectorName))
  const rotuloPendentes =
    temRevenda && temProducao
      ? 'Pendentes de produção e separação'
      : temRevenda
        ? 'Pendentes de separação'
        : 'Pendentes de produção'
  const helperPendentes =
    temRevenda && temProducao
      ? 'A produzir ou separar, por unidade.'
      : temRevenda
        ? 'A separar, por unidade.'
        : 'A produzir, por unidade.'
  return (
    <section className="grid gap-4">
      <div className="grid gap-2">
        <Link href={destinoVoltar} className={cn('text-sm font-medium text-accent', FOCO_VISIVEL)}>
          ← Voltar para os pedidos
        </Link>
        <PageHead
          title={`Pedido ${pedido.numero}`}
          description={pedido.cliente ?? 'Sem cliente'}
          actions={
            pedido.sellerLegacyCode ? (
              <Badge variant="info">Vendedor (cód. {pedido.sellerLegacyCode})</Badge>
            ) : null
          }
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Itens" value={pedido.itens.length} helper="No pedido." />
        <Metric
          label="Pendentes de desmembramento"
          value={pendentesDesmembramento}
          tone={pendentesDesmembramento > 0 ? 'warning' : 'success'}
          helper="Itens sem setor definido."
        />
        <Metric
          label={rotuloPendentes}
          value={valorPorUnidade(pedido.totaisPorUnidade, 'pendente')}
          helper={helperPendentes}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo do pedido</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {pedido.totaisPorUnidade.length === 0 ? (
            <p className="text-sm text-muted">Sem itens para medir a execução.</p>
          ) : (
            pedido.totaisPorUnidade.map((total) => {
              const percentual = percentualExecutado(total)
              const unidade = rotuloDaUnidade(total.unidade)
              const vocabulario = vocabularioDoTotal(total, pedido.itens)
              return (
                <Progress
                  key={total.unidade ?? 'sem-unidade'}
                  label={`${rotuloExecucao(vocabulario)} do pedido (${unidade})`}
                  value={percentual}
                  tone={percentual >= 100 ? 'success' : 'accent'}
                  helper={`${formatarQuantidadeParaExibicao(total.unidade, total.executado)} de ${formatarQuantidadeParaExibicao(total.unidade, total.solicitado)} ${unidade} ${participioExecucao(vocabulario)}.`}
                />
              )
            })
          )}
          <ul className="grid gap-2 text-sm text-ink">
            {agruparPorSetor(pedido.itens).map((grupo) => {
              const vocabulario = vocabularioDoSetor(grupo.sectorCode, grupo.setor)
              const unidade = rotuloDaUnidade(grupo.unidade)
              const rotuloPendente =
                grupo.setor === 'Não classificado'
                  ? 'pendente'
                  : vocabulario === 'separacao'
                    ? 'pendente de separação'
                    : 'pendente de produção'
              return (
                <li
                  key={`${grupo.setor}-${grupo.unidade ?? ''}`}
                  className="flex flex-wrap items-center justify-between gap-2"
                >
                  <span className="font-medium">{grupo.setor}</span>
                  <span className="text-muted">
                    {grupo.itens} item(ns) · solicitado{' '}
                    {formatarQuantidadeParaExibicao(grupo.unidade, grupo.solicitado)} {unidade} ·{' '}
                    {rotuloPendente} {formatarQuantidadeParaExibicao(grupo.unidade, grupo.pendente)}{' '}
                    {unidade}
                  </span>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <div aria-live="polite" className="grid gap-2">
        {sucesso ? (
          <Alert variant="success" title="Tudo certo">
            {sucesso}
          </Alert>
        ) : null}
        {erroAcao ? (
          <Alert variant="error" title="Não foi possível concluir a ação">
            {erroAcao}
          </Alert>
        ) : null}
      </div>

      {pedido.itens.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-ink">Itens do pedido</h2>
          <Button type="button" variant="outline" size="sm" onClick={alternarTodosItens}>
            {todosItensAbertos ? 'Recolher todos' : 'Abrir todos'}
          </Button>
        </div>
      ) : null}

      {pedido.itens.length === 0 ? (
        <Alert variant="info" title="Pedido sem itens">
          Este pedido não possui itens.
        </Alert>
      ) : (
        pedido.itens.map((item, indice) => {
          const percentual = percentualExecutado(item)
          const desmembrado =
            item.classificationStatus === 'CLASSIFIED' || classificados[item.itemId] === true
          const labelItem = `item ${indice + 1}`
          const aberto = itemEstaAberto(item.itemId, indice)
          const vocabulario = vocabularioDoSetor(item.sectorCode, item.sectorName)
          const statusAtividade = item.activityStatus
            ? (rotuloSituacaoDoSetor(item.activityStatus, vocabulario) ?? item.activityStatus)
            : ''
          const statusPrazoAtividade = calcularStatusPrazo({
            prazo: item.activityDeadlineAt ? new Date(item.activityDeadlineAt) : null,
            concluido: item.activityStatus === 'COMPLETED',
            agora: new Date(),
          })

          return (
            <Card key={item.itemId}>
              <CardHeader>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">
                    <button
                      type="button"
                      className={cn('flex w-full items-start gap-2 text-left', FOCO_VISIVEL)}
                      aria-expanded={aberto}
                      aria-controls={`detalhe-${item.itemId}`}
                      aria-label={`${aberto ? 'Recolher' : 'Expandir'} ${labelItem}: ${item.description ?? 'item sem descrição'}`}
                      onClick={() =>
                        setItensAbertos((atual) => ({ ...atual, [item.itemId]: !aberto }))
                      }
                    >
                      <span aria-hidden="true" className="mt-0.5 text-muted">
                        {aberto ? '▾' : '▸'}
                      </span>
                      <span>{item.description ?? 'Item sem descrição'}</span>
                    </button>
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted">
                    Item {indice + 1} · Código {item.productCode ?? '—'} · {item.unit}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!aberto ? (
                    <Badge variant={percentual >= 100 ? 'success' : 'neutral'}>{percentual}%</Badge>
                  ) : null}
                  {item.unit ? <Badge variant="neutral">{item.unit}</Badge> : null}
                  {desmembrado ? (
                    <Badge variant="success">Desmembrado</Badge>
                  ) : (
                    <Badge variant="warning">Pendente de desmembramento</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent
                id={`detalhe-${item.itemId}`}
                className={aberto ? 'grid gap-4' : 'hidden'}
              >
                <Progress
                  label={`${rotuloExecucao(vocabulario)} do ${labelItem}`}
                  value={percentual}
                  tone={tomDoProgresso(item, percentual)}
                  helper={`${formatarQuantidadeParaExibicao(item.unit, item.executado)} de ${formatarQuantidadeParaExibicao(item.unit, item.solicitado)} ${item.unit} ${participioExecucao(vocabulario)}.`}
                />

                <dl
                  aria-label={`Valores do ${labelItem}`}
                  className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink sm:grid-cols-3"
                >
                  <div>
                    <dt className="text-muted">Solicitado</dt>
                    <dd className="font-semibold">
                      {formatarQuantidadeParaExibicao(item.unit, item.solicitado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">{rotuloExecutado(vocabulario)}</dt>
                    <dd className="font-semibold">
                      {formatarQuantidadeParaExibicao(item.unit, item.executado)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Disponível</dt>
                    <dd className="font-semibold">
                      {formatarQuantidadeParaExibicao(item.unit, item.disponivel)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Entregue</dt>
                    <dd className="font-semibold">
                      {formatarQuantidadeParaExibicao(item.unit, item.entregue)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Pendente</dt>
                    <dd className="font-semibold">
                      {formatarQuantidadeParaExibicao(item.unit, item.pendente)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Unidade</dt>
                    <dd className="font-semibold">{item.unit}</dd>
                  </div>
                </dl>

                <p className="text-sm text-muted">
                  Setor: {item.sectorName ?? 'Não classificado'}
                  {statusAtividade ? ` · ${statusAtividade}` : ''}
                </p>

                {item.activityStatus || item.activityDeadlineAt ? (
                  <p className="text-sm text-muted">
                    Prazo operacional (setor):{' '}
                    {item.activityDeadlineAt
                      ? formatarDiaCivil(item.activityDeadlineAt)
                      : 'sem prazo'}
                    {statusPrazoAtividade === 'ATRASADO' ? ' · Atrasado' : ''}
                  </p>
                ) : null}

                {!semPermissaoParaPrazo ? (
                  <form
                    className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[1fr_auto] sm:items-end"
                    onSubmit={(evento) => {
                      evento.preventDefault()
                      void salvarPrazo(item.itemId)
                    }}
                    noValidate
                  >
                    <Field label={`Prazo de entrega (${labelItem})`}>
                      {(props) => (
                        <Input
                          {...props}
                          type="date"
                          value={rascunhos[item.itemId] ?? diaCivilParaInput(item.deadlineAt)}
                          onChange={(evento) =>
                            setRascunhos((atual) => ({
                              ...atual,
                              [item.itemId]: evento.target.value,
                            }))
                          }
                        />
                      )}
                    </Field>
                    <Button
                      type="submit"
                      disabled={salvando === item.itemId}
                      aria-label={`Salvar prazo de entrega (${labelItem})`}
                    >
                      {salvando === item.itemId ? 'Salvando…' : 'Salvar prazo'}
                    </Button>
                  </form>
                ) : null}

                {item.deadlineAt ? (
                  <Badge variant="success">
                    Prazo de entrega: {formatarDiaCivil(item.deadlineAt)}
                  </Badge>
                ) : (
                  <Badge variant="neutral">Sem prazo</Badge>
                )}

                {permitirClassificacao ? (
                  <div className="grid gap-3 border-t border-line pt-4">
                    <p className="text-sm font-semibold text-ink">Desmembramento</p>
                    {item.suggestedSectorId && !desmembrado ? (
                      <p className="text-xs text-muted">
                        Sugerido pelo produto:{' '}
                        {setores.find((s) => s.id === item.suggestedSectorId)?.name ?? '—'}
                      </p>
                    ) : null}
                    {desmembrado ? (
                      <Alert variant="success" title="Item desmembrado">
                        Setor definido: {item.sectorName ?? '—'}. Você pode continuar com as
                        remessas abaixo.
                      </Alert>
                    ) : (
                      <form
                        className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end"
                        onSubmit={(evento) => {
                          evento.preventDefault()
                          void classificar(item.itemId)
                        }}
                        noValidate
                      >
                        <Field label={`Setor do ${labelItem}`}>
                          {(props) => (
                            <select
                              id={props.id}
                              aria-describedby={props['aria-describedby']}
                              className={CLASSE_SELECT}
                              value={escolhas[item.itemId] ?? item.suggestedSectorId ?? ''}
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
                          aria-label={`Classificar ${labelItem}`}
                        >
                          {classificando === item.itemId ? 'Desmembrando…' : 'Desmembrar'}
                        </Button>
                      </form>
                    )}
                  </div>
                ) : null}

                {permitirClassificacao && desmembrado && podeCorrigirSetor ? (
                  <div className="grid gap-3 border-t border-line pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">Correção de setor</p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Corrigir setor do ${labelItem}`}
                        aria-expanded={correcaoAberta[item.itemId] === true}
                        disabled={Boolean(item.bloqueioCorrecaoSetor)}
                        onClick={() => {
                          limparFeedback()
                          setCorrecaoAberta((atual) => ({
                            ...atual,
                            [item.itemId]: !atual[item.itemId],
                          }))
                        }}
                      >
                        {correcaoAberta[item.itemId] ? '− Fechar' : 'Corrigir setor'}
                      </Button>
                    </div>

                    {item.bloqueioCorrecaoSetor ? (
                      <p className="text-sm text-muted">
                        <span className="font-medium text-ink">Correção bloqueada</span> —{' '}
                        {item.bloqueioCorrecaoSetor} O setor deste item não pode ser alterado.
                      </p>
                    ) : null}

                    {!item.bloqueioCorrecaoSetor && correcaoAberta[item.itemId] ? (
                      <form
                        className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3"
                        onSubmit={(evento) => {
                          evento.preventDefault()
                          void corrigirSetor(item)
                        }}
                        noValidate
                      >
                        <Field label={`Novo setor do ${labelItem}`}>
                          {(props) => (
                            <select
                              id={props.id}
                              aria-describedby={props['aria-describedby']}
                              className={CLASSE_SELECT}
                              value={correcaoSetor[item.itemId] ?? item.sectorId ?? ''}
                              onChange={(evento) =>
                                setCorrecaoSetor((atual) => ({
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

                        {exigeJustificativaCorrecao ? (
                          <Field
                            label={`Motivo da correção (${labelItem})`}
                            required
                            hint={`${contarCaracteresMotivo((correcaoMotivo[item.itemId] ?? '').trim())} de ${LIMITE_MOTIVO_CORRECAO} caracteres.`}
                          >
                            {(props) => (
                              <textarea
                                id={props.id}
                                aria-describedby={props['aria-describedby']}
                                aria-invalid={props.invalid || undefined}
                                rows={3}
                                className={cn(CLASSE_SELECT, 'min-h-24 py-2')}
                                value={correcaoMotivo[item.itemId] ?? ''}
                                onChange={(evento) =>
                                  setCorrecaoMotivo((atual) => ({
                                    ...atual,
                                    [item.itemId]: evento.target.value,
                                  }))
                                }
                              />
                            )}
                          </Field>
                        ) : null}

                        {correcaoErro[item.itemId] ? (
                          <p role="alert" className="text-sm font-medium text-danger">
                            {correcaoErro[item.itemId]}
                          </p>
                        ) : null}

                        <Button
                          type="submit"
                          disabled={corrigindo === item.itemId}
                          aria-label={`Confirmar correção de setor do ${labelItem}`}
                        >
                          {corrigindo === item.itemId ? 'Corrigindo…' : 'Confirmar correção'}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}

                {permitirClassificacao ? (
                  <div className="grid gap-3 border-t border-line pt-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-ink">
                        Entregas programadas (remessas)
                      </p>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        aria-label={`Adicionar remessa do ${labelItem}`}
                        aria-expanded={remessaAberta[item.itemId] === true}
                        onClick={() => {
                          limparFeedback()
                          setRemessaAberta((atual) => ({
                            ...atual,
                            [item.itemId]: !atual[item.itemId],
                          }))
                        }}
                      >
                        {remessaAberta[item.itemId] ? '− Fechar' : '+ Adicionar remessa'}
                      </Button>
                    </div>

                    {item.remessas && item.remessas.length > 0 ? (
                      <ul className="grid gap-2 text-sm text-ink">
                        {item.remessas.map((remessa) => {
                          const processando = remessaProcessando[remessa.id]
                          const emConfirmacaoExclusao = remessaParaExcluir?.id === remessa.id
                          const tituloExclusao = `excluir-remessa-titulo-${remessa.id}`
                          const descricaoExclusao = `excluir-remessa-descricao-${remessa.id}`
                          return (
                            <li
                              key={remessa.id}
                              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2"
                            >
                              <span>
                                {remessa.remessa}ª remessa · prevista para{' '}
                                {formatarDataRemessa(remessa.scheduledAt)}
                              </span>
                              <div className="flex flex-wrap items-center gap-2">
                                {remessa.confirmedAt ? (
                                  <Badge variant="success">
                                    Confirmada em {formatarDataRemessa(remessa.confirmedAt)}
                                  </Badge>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => void confirmarRemessa(remessa.id, item.itemId)}
                                    disabled={processando !== undefined || emConfirmacaoExclusao}
                                    aria-busy={processando === 'confirmar'}
                                    aria-label={`Confirmar ${remessa.remessa}ª remessa do ${labelItem}`}
                                  >
                                    {processando === 'confirmar' ? 'Confirmando…' : 'Confirmar'}
                                  </Button>
                                )}
                                {emConfirmacaoExclusao ? (
                                  <div
                                    role="alertdialog"
                                    aria-modal="false"
                                    aria-labelledby={tituloExclusao}
                                    aria-describedby={descricaoExclusao}
                                    className="grid w-full gap-2 rounded-lg border border-danger/40 bg-danger-bg p-2 text-danger"
                                    onKeyDown={(evento) => {
                                      if (evento.key === 'Escape') {
                                        evento.stopPropagation()
                                        cancelarExclusaoRemessa()
                                      }
                                    }}
                                  >
                                    <div>
                                      <p id={tituloExclusao} className="text-sm font-semibold">
                                        Excluir {remessa.remessa}ª remessa?
                                      </p>
                                      <p id={descricaoExclusao} className="text-xs">
                                        {remessa.confirmedAt
                                          ? `A remessa prevista para ${formatarDataRemessa(remessa.scheduledAt)} está confirmada. A exclusão removerá também o registro da confirmação. Entregas e saldos não serão alterados.`
                                          : `A remessa prevista para ${formatarDataRemessa(remessa.scheduledAt)} será removida. Entregas e saldos não serão alterados.`}
                                      </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        ref={cancelarExclusaoRef}
                                        onClick={cancelarExclusaoRemessa}
                                        disabled={processando === 'remover'}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="danger"
                                        size="sm"
                                        onClick={() => void excluirRemessa()}
                                        disabled={processando === 'remover'}
                                        aria-busy={processando === 'remover'}
                                      >
                                        {processando === 'remover'
                                          ? 'Excluindo…'
                                          : 'Excluir remessa'}
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    ref={(elemento) => {
                                      removerRemessaRefs.current[remessa.id] = elemento
                                    }}
                                    onClick={() => solicitarExclusaoRemessa(remessa, item.itemId)}
                                    disabled={processando !== undefined}
                                    aria-label={`Remover ${remessa.remessa}ª remessa do ${labelItem}`}
                                  >
                                    Remover
                                  </Button>
                                )}
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted">Sem remessa programada.</p>
                    )}

                    {remessaAberta[item.itemId] ? (
                      <form
                        className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-[8rem_1fr_auto] sm:items-end"
                        onSubmit={(evento) => {
                          evento.preventDefault()
                          void programarRemessa(item.itemId)
                        }}
                        noValidate
                      >
                        <Field label={`Remessa (${labelItem})`}>
                          {(props) => (
                            <Input
                              {...props}
                              type="number"
                              min={1}
                              inputMode="numeric"
                              value={remessaNumero[item.itemId] ?? ''}
                              onChange={(evento) =>
                                setRemessaNumero((atual) => ({
                                  ...atual,
                                  [item.itemId]: evento.target.value,
                                }))
                              }
                            />
                          )}
                        </Field>
                        <Field label={`Data prevista (${labelItem})`}>
                          {(props) => (
                            <Input
                              {...props}
                              type="date"
                              value={remessaData[item.itemId] ?? ''}
                              onChange={(evento) =>
                                setRemessaData((atual) => ({
                                  ...atual,
                                  [item.itemId]: evento.target.value,
                                }))
                              }
                            />
                          )}
                        </Field>
                        <Button
                          type="submit"
                          disabled={remessaSalvando === item.itemId}
                          aria-label={`Programar remessa do ${labelItem}`}
                        >
                          {remessaSalvando === item.itemId ? 'Programando…' : 'Programar remessa'}
                        </Button>
                      </form>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          )
        })
      )}
    </section>
  )
}
