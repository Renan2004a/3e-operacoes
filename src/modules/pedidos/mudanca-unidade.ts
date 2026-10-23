import { chaveUnidade } from '../producao/totais-por-unidade'

/** Registros operacionais que tornam uma mudança de unidade incompatível. */
export interface RegistrosOperacionaisDoItem {
  atividades: ReadonlyArray<{
    status: string
    execucoes: number
    ocorrencias: number
  }>
  entregas: number
  /** Remessas programadas; não têm quantidade, mas são compromisso operacional. */
  remessas?: number
}

export type DecisaoMudancaUnidade =
  | { tipo: 'SEM_MUDANCA' }
  | { tipo: 'ATUALIZAR' }
  | { tipo: 'BLOQUEAR'; motivo: 'REGISTROS_OPERACIONAIS' }

/**
 * Decide se a unidade recebida do Top Gerente pode substituir a unidade atual.
 *
 * A normalização existente (`chaveUnidade`: trim + maiúsculas) é usada apenas
 * para reconhecer diferenças de escrita, como `M` e `m`. Mudança real de
 * unidade é bloqueada quando há execução, ocorrência, entrega, remessa
 * programada ou atividade já iniciada. Remessas não armazenam quantidade, mas
 * são compromissos operacionais e também preservam a unidade anterior.
 */
export function avaliarMudancaUnidade(input: {
  unidadeAtual: string
  unidadeNova: string
  registros: RegistrosOperacionaisDoItem
}): DecisaoMudancaUnidade {
  if (chaveUnidade(input.unidadeAtual) === chaveUnidade(input.unidadeNova)) {
    return { tipo: 'SEM_MUDANCA' }
  }

  const temRegistro =
    input.registros.entregas > 0 ||
    (input.registros.remessas ?? 0) > 0 ||
    input.registros.atividades.some(
      (atividade) =>
        atividade.status !== 'PENDING' || atividade.execucoes > 0 || atividade.ocorrencias > 0,
    )

  return temRegistro
    ? { tipo: 'BLOQUEAR', motivo: 'REGISTROS_OPERACIONAIS' }
    : { tipo: 'ATUALIZAR' }
}
