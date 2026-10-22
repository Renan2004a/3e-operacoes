import { Prisma } from '@/generated/prisma/client'
import {
  chaveUnidade,
  compararUnidades,
  rotuloUnidade,
} from '../producao/totais-por-unidade'
import type { Quantidade } from '../producao/unidades'
import type { AtividadeIndicador } from './painel'

/** Execução agregável por setor e unidade, com a quantidade produzida (IND-07). */
export interface ExecucaoIndicador {
  sectorId: string
  /** Unidade de medida do item executado; a produção não soma unidades diferentes (RN01). */
  unidade: string
  quantidade: Quantidade
  /** Nome do setor, para exibição. */
  sectorName?: string | null
}

/** Atividade com prazo e o momento da conclusão, quando houver (IND-08). */
export interface AtividadeComPrazo extends AtividadeIndicador {
  deadlineAt: Date | null
  /**
   * Momento da última execução registrada; null quando não há execução. O
   * adapter entrega a execução mais recente (`occurredAt` desc) (QF-08).
   */
  completedAt: Date | null
}

/** Porta de leitura das execuções e das atividades com prazo (IND-07, IND-08). */
export interface PcpRepository {
  listarExecucoes(): Promise<ExecucaoIndicador[]>
  listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]>
}

export interface ProducaoPorSetor {
  sectorId: string
  /** Unidade de medida da produção; `null` quando o item não tem unidade informada (RN05). */
  unidade: string | null
  quantidade: Quantidade
  /** Nome do setor, para exibição. */
  sectorName?: string | null
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
 * Consolida os indicadores de PCP: produção por setor e unidade (soma das
 * execuções de mesma unidade) e cumprimento de prazo sobre as atividades
 * concluídas que possuem prazo (IND-07, IND-08). Atividades sem prazo não
 * entram no cálculo. Uma atividade `COMPLETED` sem execução fica fora do
 * indicador: sem execução não há atraso a atribuir (QF-08).
 *
 * SPEC_DEVIATION: `design.md` declara `montarPcp(agora)`; a fórmula do spec
 * ("concluídas no prazo ÷ concluídas com prazo") depende do momento de conclusão
 * da atividade, não do instante corrente, então não há parâmetro `agora`.
 */
export function montarPcpDe(
  execucoes: readonly ExecucaoIndicador[],
  atividades: readonly AtividadeComPrazo[],
): Pcp {
  const producao = new Map<string, ProducaoPorSetor>()
  for (const execucao of execucoes) {
    const unidade = rotuloUnidade(execucao.unidade)
    const chave = `${execucao.sectorId}\u0000${unidade === null ? '' : chaveUnidade(unidade)}`
    const atual = producao.get(chave)
    producao.set(chave, {
      sectorId: execucao.sectorId,
      unidade: atual?.unidade ?? unidade,
      quantidade: (atual?.quantidade ?? new Prisma.Decimal(0)).plus(execucao.quantidade),
      sectorName: atual?.sectorName ?? execucao.sectorName,
    })
  }

  const concluidasComPrazo = atividades.filter(
    (atividade) =>
      atividade.deadlineAt !== null &&
      atividade.status === 'COMPLETED' &&
      atividade.completedAt !== null,
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
    producaoPorSetor: [...producao.values()].sort(
      (a, b) => a.sectorId.localeCompare(b.sectorId) || compararUnidades(a.unidade, b.unidade),
    ),
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
