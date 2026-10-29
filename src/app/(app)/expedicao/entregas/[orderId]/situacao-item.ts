export type CodigoSituacao = 'DISPONIVEL' | 'ENTREGA_PARCIAL' | 'ENTREGUE' | 'AGUARDANDO_PRODUCAO'

export interface SituacaoItem {
  codigo: CodigoSituacao
  rotulo: string
  variante: 'success' | 'info' | 'neutral' | 'warning'
}

export interface QuantidadesDoItem {
  solicitado: number
  disponivel: number
  entregue: number
  pendente: number
}

/**
 * Situação do item para quem entrega. "Sem saldo" confundia três casos: nada
 * produzido ainda, tudo o que foi produzido já entregue, e item concluído.
 * Só o último é "Entregue": todo o solicitado saiu e nada falta produzir.
 */
export function situacaoDoItem(q: QuantidadesDoItem): SituacaoItem {
  if (q.disponivel > 0) {
    return q.entregue > 0
      ? { codigo: 'ENTREGA_PARCIAL', rotulo: 'Entrega parcial', variante: 'info' }
      : { codigo: 'DISPONIVEL', rotulo: 'Disponível', variante: 'success' }
  }
  if (q.entregue > 0 && q.pendente <= 0) {
    return { codigo: 'ENTREGUE', rotulo: 'Entregue', variante: 'neutral' }
  }
  return { codigo: 'AGUARDANDO_PRODUCAO', rotulo: 'Aguardando produção', variante: 'warning' }
}
