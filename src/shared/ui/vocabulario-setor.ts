/**
 * Vocabulário operacional do setor. Revenda separa itens; os demais setores
 * produzem. A regra vale por setor do item/bloco, nunca pelo perfil inteiro
 * (docs/regras-negocio.md).
 */
export type VocabularioSetor = 'producao' | 'separacao'

/** Código do setor é a fonte principal; o nome cobre respostas sem código. */
export function vocabularioDoSetor(codigo?: string | null, nome?: string | null): VocabularioSetor {
  if (codigo?.trim().toUpperCase() === 'REVENDA') return 'separacao'
  if (nome?.trim().toLowerCase() === 'revenda') return 'separacao'
  return 'producao'
}

export function ehRevenda(codigo?: string | null, nome?: string | null): boolean {
  return vocabularioDoSetor(codigo, nome) === 'separacao'
}

/** Título do progresso: “Execução do …” ou “Separação do …”. */
export function rotuloExecucao(vocabulario: VocabularioSetor): string {
  return vocabulario === 'separacao' ? 'Separação' : 'Execução'
}

/** Rótulo do valor executado: “Executado” ou “Separado”. */
export function rotuloExecutado(vocabulario: VocabularioSetor): string {
  return vocabulario === 'separacao' ? 'Separado' : 'Executado'
}

/** Particípio do helper de progresso: “executadas” ou “separadas”. */
export function participioExecucao(vocabulario: VocabularioSetor): string {
  return vocabulario === 'separacao' ? 'separadas' : 'executadas'
}

/** Situação da atividade com o vocabulário do setor, sem mudar o código. */
export function rotuloSituacaoDoSetor(
  status: string,
  vocabulario: VocabularioSetor,
): string | null {
  if (status === 'IN_PROGRESS' && vocabulario === 'separacao') return 'Em separação'
  const rotulos: Record<string, string> = {
    PENDING: 'Pendente',
    IN_PROGRESS: 'Em execução',
    PAUSED: 'Pausada',
    COMPLETED: 'Concluída',
    DIVERGENT: 'Divergente',
  }
  return rotulos[status] ?? null
}
