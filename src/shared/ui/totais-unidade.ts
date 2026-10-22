/** Total de um grupo de itens com a mesma unidade, como a API o entrega. */
export interface TotalUnidadeView {
  unidade: string | null
  itens: number
  solicitado: string | number
  executado: string | number
  disponivel: string | number
  entregue: string | number
  pendente: string | number
}

export type CampoTotal = Exclude<keyof TotalUnidadeView, 'unidade' | 'itens'>

/** Rótulo do grupo sem unidade informada: nunca se inventa uma unidade (RN05). */
export const ROTULO_SEM_UNIDADE = 'sem unidade informada'

export function rotuloDaUnidade(unidade: string | null): string {
  return unidade ?? ROTULO_SEM_UNIDADE
}

/**
 * Valor de um campo por unidade, sem somar unidades diferentes (RN01, RN02):
 * "30 peça · 15 metro". Sem itens, mostra "0".
 */
export function valorPorUnidade(totais: readonly TotalUnidadeView[], campo: CampoTotal): string {
  if (totais.length === 0) return '0'
  return totais.map((total) => `${total[campo]} ${rotuloDaUnidade(total.unidade)}`).join(' · ')
}
