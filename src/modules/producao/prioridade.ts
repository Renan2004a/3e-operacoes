import type { Atividade } from './fila'
import { AtividadeNaoEncontradaError } from './registrar-execucao'

export interface PrioridadeRepository {
  /** Atualiza a prioridade e retorna a atividade, ou null se não existir. */
  definirPrioridade(input: { atividadeId: string; prioridade: number }): Promise<Atividade | null>
}

export interface DefinirPrioridadeInput {
  atividadeId: string
  prioridade: number
}

/**
 * Define a prioridade de uma atividade (RF007). A prioridade é persistida e
 * passa a orientar a ordenação da fila (PROD-11).
 */
export async function definirPrioridade(
  input: DefinirPrioridadeInput,
  repo: PrioridadeRepository,
): Promise<Atividade> {
  const atividade = await repo.definirPrioridade(input)
  if (!atividade) throw new AtividadeNaoEncontradaError(input.atividadeId)
  return atividade
}
