'use client'

import { useCallback, useEffect, useState } from 'react'
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
import { rotuloDaUnidade, valorPorUnidade, type TotalUnidadeView } from './totais-unidade'
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

const ROTULO_SITUACAO: Record<string, string> = {
  PENDING: 'Pendente',
  IN_PROGRESS: 'Em execução',
  PAUSED: 'Pausada',
  COMPLETED: 'Concluída',
  DIVERGENT: 'Divergente',
}

/**
 * Agrupa os itens por setor e unidade para o desmembramento operacional.
 * Unidades diferentes ficam em linhas separadas (RN01, RN02).
 */
function agruparPorSetor(itens: ItemSaldo[]) {
  const mapa = new Map<
    string,
    { setor: string; unidade: string | null; itens: number; solicitado: number; pendente: number }
  >()
  for (const item of itens) {
    const setor = item.sectorName ?? 'Não classificado'
    const unidade = item.unit.trim() === '' ? null : item.unit.trim()
    const chave = `${setor}\u0000${unidade?.toUpperCase() ?? ''}`
    const atual = mapa.get(chave) ?? { setor, unidade, itens: 0, solicitado: 0, pendente: 0 }
    atual.itens += 1
    atual.solicitado += Number(item.solicitado) || 0
    atual.pendente += Number(item.pendente) || 0
    mapa.set(chave, atual)
  }
  return Array.from(mapa.values())
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

  const [perfis, setPerfis] = useState<RoleCode[]>([])
  const [correcaoAberta, setCorrecaoAberta] = useState<Record<string, boolean>>({})
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

  async function confirmarRemessa(id: string, itemId: string) {
    limparFeedback()
    try {
      const resposta = await apiPatch<{ remessa: Remessa }>(`/api/pedidos/remessas/${id}`, {})
      atualizarRemessas(itemId, (remessas) =>
        remessas.map((remessa) => (remessa.id === id ? resposta.remessa : remessa)),
      )
      setSucesso('Remessa confirmada.')
    } catch {
      setErroAcao('Não foi possível confirmar a remessa. Tente novamente.')
    }
  }

  async function removerRemessa(id: string, itemId: string) {
    limparFeedback()
    try {
      await apiDelete(`/api/pedidos/remessas/${id}`)
      atualizarRemessas(itemId, (remessas) => remessas.filter((remessa) => remessa.id !== id))
      setSucesso('Remessa removida.')
    } catch {
      setErroAcao('Não foi possível remover a remessa. Tente novamente.')
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
              <Badge variant="info">Vendedor {pedido.sellerLegacyCode}</Badge>
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
          label="Pendentes de produção"
          value={valorPorUnidade(pedido.totaisPorUnidade, 'pendente')}
          helper="A produzir ou separar, por unidade."
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
              return (
                <Progress
                  key={total.unidade ?? 'sem-unidade'}
                  label={`Execução do pedido (${unidade})`}
                  value={percentual}
                  tone={percentual >= 100 ? 'success' : 'accent'}
                  helper={`${total.executado} de ${total.solicitado} ${unidade} executadas.`}
                />
              )
            })
          )}
          <ul className="grid gap-2 text-sm text-ink">
            {agruparPorSetor(pedido.itens).map((grupo) => (
              <li
                key={`${grupo.setor}-${grupo.unidade ?? ''}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span className="font-medium">{grupo.setor}</span>
                <span className="text-muted">
                  {grupo.itens} item(ns) · solicitado {grupo.solicitado}{' '}
                  {rotuloDaUnidade(grupo.unidade)} · pendente {grupo.pendente}{' '}
                  {rotuloDaUnidade(grupo.unidade)}
                </span>
              </li>
            ))}
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
          const statusPrazoAtividade = calcularStatusPrazo({
            prazo: item.activityDeadlineAt ? new Date(item.activityDeadlineAt) : null,
            concluido: item.activityStatus === 'COMPLETED',
            agora: new Date(),
          })

          return (
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
                <div className="flex flex-wrap items-center gap-2">
                  {item.unit ? <Badge variant="neutral">{item.unit}</Badge> : null}
                  {desmembrado ? (
                    <Badge variant="success">Desmembrado</Badge>
                  ) : (
                    <Badge variant="warning">Pendente de desmembramento</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="grid gap-4">
                <Progress
                  label={`Execução do ${labelItem}`}
                  value={percentual}
                  tone={tomDoProgresso(item, percentual)}
                  helper={`${item.executado} de ${item.solicitado} ${item.unit} executadas.`}
                />

                <dl
                  aria-label={`Valores do ${labelItem}`}
                  className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-ink sm:grid-cols-3"
                >
                  <div>
                    <dt className="text-muted">Solicitado</dt>
                    <dd className="font-semibold">{item.solicitado}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Executado</dt>
                    <dd className="font-semibold">{item.executado}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Disponível</dt>
                    <dd className="font-semibold">{item.disponivel}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Entregue</dt>
                    <dd className="font-semibold">{item.entregue}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Pendente</dt>
                    <dd className="font-semibold">{item.pendente}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Unidade</dt>
                    <dd className="font-semibold">{item.unit}</dd>
                  </div>
                </dl>

                <p className="text-sm text-muted">
                  Setor: {item.sectorName ?? 'Não classificado'}
                  {item.activityStatus
                    ? ` · ${ROTULO_SITUACAO[item.activityStatus] ?? item.activityStatus}`
                    : ''}
                </p>

                {item.activityStatus || item.activityDeadlineAt ? (
                  <p className="text-sm text-muted">
                    Prazo do setor:{' '}
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
                    <Field label={`Prazo do ${labelItem}`}>
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
                      aria-label={`Salvar prazo do ${labelItem}`}
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
                      <Alert variant="warning" title="Correção bloqueada">
                        {item.bloqueioCorrecaoSetor} O setor deste item não pode ser alterado.
                      </Alert>
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
                        {item.remessas.map((remessa) => (
                          <li
                            key={remessa.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2"
                          >
                            <span>
                              {remessa.remessa}ª remessa · prevista para{' '}
                              {formatarDataRemessa(remessa.scheduledAt)}
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
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
                                  aria-label={`Confirmar ${remessa.remessa}ª remessa do ${labelItem}`}
                                >
                                  Confirmar
                                </Button>
                              )}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void removerRemessa(remessa.id, item.itemId)}
                                aria-label={`Remover ${remessa.remessa}ª remessa do ${labelItem}`}
                              >
                                Remover
                              </Button>
                            </span>
                          </li>
                        ))}
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
