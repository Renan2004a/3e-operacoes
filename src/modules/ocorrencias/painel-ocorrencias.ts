import type { ActivityStatus } from '../producao/tipos'
import type { Quantidade } from '../producao/unidades'
import { TIPOS_OCORRENCIA, type TipoOcorrencia } from './motivos'

/**
 * Ocorrência enriquecida para as telas do Operador e do Gerente (OCO-07).
 * O vínculo com o pedido vem da atividade → item → pedido, sem duplicar dados.
 */
export interface OcorrenciaDetalhada {
  id: string
  activityId: string
  tipo: TipoOcorrencia
  quantidade: Quantidade | null
  observacao: string | null
  occurredAt: Date
  /** Descrição do motivo da lista fechada, quando houver. */
  motivo: string | null
  pedido: string
  item: string | null
  setor: string | null
  /** Nome de quem registrou. */
  usuario: string | null
  /** Situação da atividade no momento da leitura (Pendente, Em execução…). */
  activityStatus: ActivityStatus | null
}

export interface ContagemPorTipoOcorrencia {
  tipo: TipoOcorrencia
  total: number
}

export interface ResumoOcorrencias {
  total: number
  /** Ocorrências dos últimos 7 dias (indicador do dashboard). */
  ultimos7Dias: number
  /** Contagem por tipo, incluindo os tipos sem ocorrência (zero). */
  porTipo: ContagemPorTipoOcorrencia[]
  recentes: OcorrenciaDetalhada[]
}

export interface OcorrenciasPainelRepository {
  /**
   * Ocorrências em ordem decrescente de data. Com `usuarioId`, restringe ao
   * autor (visão do Operador); sem, traz todas (visão do Gerente).
   */
  listarOcorrenciasDetalhadas(filtro?: {
    usuarioId?: string
    limite?: number
  }): Promise<OcorrenciaDetalhada[]>
}

const DIA_MS = 24 * 60 * 60 * 1000
const JANELA_INDICADOR_DIAS = 7
const LIMITE_PAINEL = 200

/**
 * Consolida as ocorrências para o dashboard do gerente: total, últimos 7 dias,
 * contagem por tipo e as mais recentes. Não inventa situação de análise — o
 * fluxo de resolução ainda não faz parte das regras do sistema (documentado).
 */
export function montarResumoOcorrencias(
  ocorrencias: readonly OcorrenciaDetalhada[],
  agora: Date,
  limiteRecentes = 10,
): ResumoOcorrencias {
  const total = ocorrencias.length
  const ultimos7Dias = ocorrencias.filter(
    (ocorrencia) => agora.getTime() - ocorrencia.occurredAt.getTime() <= JANELA_INDICADOR_DIAS * DIA_MS,
  ).length

  const porTipo = TIPOS_OCORRENCIA.map((tipo) => ({
    tipo,
    total: ocorrencias.filter((ocorrencia) => ocorrencia.tipo === tipo).length,
  }))

  const recentes = [...ocorrencias]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .slice(0, limiteRecentes)

  return { total, ultimos7Dias, porTipo, recentes }
}

/** Ocorrências registradas pelo próprio operador (OCO-07). */
export async function listarOcorrenciasDoUsuario(
  usuarioId: string,
  repo: OcorrenciasPainelRepository,
): Promise<OcorrenciaDetalhada[]> {
  return repo.listarOcorrenciasDetalhadas({ usuarioId, limite: 50 })
}

/** Resumo das ocorrências para o painel do gerente de produção. */
export async function resumoOcorrencias(
  repo: OcorrenciasPainelRepository,
  agora: Date,
): Promise<ResumoOcorrencias> {
  return montarResumoOcorrencias(
    await repo.listarOcorrenciasDetalhadas({ limite: LIMITE_PAINEL }),
    agora,
  )
}
