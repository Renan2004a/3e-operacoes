import { Prisma } from '@/generated/prisma/client'
import type { Quantidade } from '../producao/unidades'
import type { AtividadeIndicador } from './painel'

/** Execução agregável por setor, com a quantidade produzida (IND-07). */
export interface ExecucaoIndicador {
  sectorId: string
  quantidade: Quantidade
}

/** Atividade com prazo e o momento da conclusão, quando houver (IND-08). */
export interface AtividadeComPrazo extends AtividadeIndicador {
  deadlineAt: Date | null
  /** Momento em que a atividade foi concluída; null sem execução registrada. */
  completedAt: Date | null
}

/** Porta de leitura das execuções e das atividades com prazo (IND-07, IND-08). */
export interface PcpRepository {
  listarExecucoes(): Promise<ExecucaoIndicador[]>
  listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]>
}

export interface ProducaoPorSetor {
  sectorId: string
  quantidade: Quantidade
}

export interface CumprimentoPrazo {
  /** Atividades concluídas que possuem prazo (denominador). */
  concluidasComPrazo: number
  /** Concluídas dentro do prazo (numerador). */
  concluidasNoPrazo: number
  /** Percentual de 0 a 100; 0 quando não há concluídas com prazo. */
  percentual: number
}

export interface Pcp {
  producaoPorSetor: ProducaoPorSetor[]
  cumprimentoPrazo: CumprimentoPrazo
}

/**
 * Consolida os indicadores de PCP: produção por setor (soma das execuções) e
 * cumprimento de prazo sobre as atividades concluídas que possuem prazo
 * (IND-07, IND-08). Atividades sem prazo não entram no cálculo.
 *
 * SPEC_DEVIATION: `design.md` declara `montarPcp(agora)`; a fórmula do spec
 * ("concluídas no prazo ÷ concluídas com prazo") depende do momento de conclusão
 * da atividade, não do instante corrente, então não há parâmetro `agora`.
 */
export function montarPcpDe(
  execucoes: readonly ExecucaoIndicador[],
  atividades: readonly AtividadeComPrazo[],
): Pcp {
  const producao = new Map<string, Quantidade>()
  for (const execucao of execucoes) {
    const acumulado = producao.get(execucao.sectorId) ?? new Prisma.Decimal(0)
    producao.set(execucao.sectorId, acumulado.plus(execucao.quantidade))
  }

  const concluidasComPrazo = atividades.filter(
    (atividade) => atividade.deadlineAt !== null && atividade.status === 'COMPLETED',
  )
  const concluidasNoPrazo = concluidasComPrazo.filter(
    (atividade) =>
      atividade.completedAt !== null &&
      atividade.deadlineAt !== null &&
      atividade.completedAt.getTime() <= atividade.deadlineAt.getTime(),
  )
  const percentual =
    concluidasComPrazo.length === 0
      ? 0
      : (concluidasNoPrazo.length / concluidasComPrazo.length) * 100

  return {
    producaoPorSetor: [...producao.entries()]
      .map(([sectorId, quantidade]) => ({ sectorId, quantidade }))
      .sort((a, b) => a.sectorId.localeCompare(b.sectorId)),
    cumprimentoPrazo: {
      concluidasComPrazo: concluidasComPrazo.length,
      concluidasNoPrazo: concluidasNoPrazo.length,
      percentual,
    },
  }
}

/** Monta os indicadores de PCP a partir do banco do app (IND-07, IND-08, IND-09). */
export async function montarPcp(repo: PcpRepository): Promise<Pcp> {
  const [execucoes, atividades] = await Promise.all([
    repo.listarExecucoes(),
    repo.listarAtividadesComPrazo(),
  ])
  return montarPcpDe(execucoes, atividades)
}
