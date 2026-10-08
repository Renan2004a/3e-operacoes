import type { ActivityStatus } from '../producao/tipos'

/** Atividade como o painel a enxerga: setor e situação (IND-05). */
export interface AtividadeIndicador {
  id: string
  sectorId: string
  status: ActivityStatus
  /** Nome do setor, para exibição (evita mostrar o ID). */
  sectorName?: string | null
}

/** Porta de leitura das atividades para o painel e o PCP (IND-05). */
export interface PainelRepository {
  listarAtividades(): Promise<AtividadeIndicador[]>
}

export interface ContagemPorSetor {
  sectorId: string
  total: number
  /** Nome do setor, para exibição. */
  sectorName?: string | null
}

export interface ContagemPorStatus {
  status: ActivityStatus
  total: number
}

export interface Painel {
  porSetor: ContagemPorSetor[]
  porStatus: ContagemPorStatus[]
  /** Atividades não concluídas (IND-06). */
  pendencias: number
}

/** Ordem estável de exibição das contagens por status. */
const ORDEM_STATUS: readonly ActivityStatus[] = [
  'PENDING',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'DIVERGENT',
]

/**
 * Consolida as atividades em contagem por setor e por status, além das
 * pendências (atividades não concluídas) (IND-05, IND-06). Reusável pelo PCP.
 */
export function montarPainelDe(atividades: readonly AtividadeIndicador[]): Painel {
  const porSetor = new Map<string, number>()
  const nomeDoSetor = new Map<string, string | null>()
  const porStatus = new Map<ActivityStatus, number>()
  let pendencias = 0

  for (const atividade of atividades) {
    porSetor.set(atividade.sectorId, (porSetor.get(atividade.sectorId) ?? 0) + 1)
    if (atividade.sectorName && !nomeDoSetor.has(atividade.sectorId)) {
      nomeDoSetor.set(atividade.sectorId, atividade.sectorName)
    }
    porStatus.set(atividade.status, (porStatus.get(atividade.status) ?? 0) + 1)
    if (atividade.status !== 'COMPLETED') pendencias += 1
  }

  return {
    porSetor: [...porSetor.entries()]
      .map(([sectorId, total]) => ({ sectorId, total, sectorName: nomeDoSetor.get(sectorId) }))
      .sort((a, b) => a.sectorId.localeCompare(b.sectorId)),
    porStatus: ORDEM_STATUS.filter((status) => porStatus.has(status)).map((status) => ({
      status,
      total: porStatus.get(status) ?? 0,
    })),
    pendencias,
  }
}

/** Monta o painel consolidado por setor e status (IND-05, IND-06). */
export async function montarPainel(repo: PainelRepository): Promise<Painel> {
  return montarPainelDe(await repo.listarAtividades())
}
