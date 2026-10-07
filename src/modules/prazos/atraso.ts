/** Status derivado do prazo; nunca `ATRASADO` sem prazo definido (PRAZO-05..09). */
export type StatusPrazo = 'SEM_PRAZO' | 'EM_DIA' | 'ATRASADO'

export interface CalcularStatusPrazoInput {
  /** Prazo aplicável; null/ausente quando não foi definido. */
  prazo: Date | null
  /** Indica que o escopo correspondente já foi concluído. */
  concluido: boolean
  /** Instante da avaliação, em UTC. */
  agora: Date
}

/**
 * Calcula o status do prazo: sem data → `SEM_PRAZO`; data ultrapassada e não
 * concluído → `ATRASADO`; caso contrário → `EM_DIA`. A comparação é em UTC e a
 * igualdade não conta como ultrapassado (PRAZO-05..09).
 */
export function calcularStatusPrazo({
  prazo,
  concluido,
  agora,
}: CalcularStatusPrazoInput): StatusPrazo {
  if (!prazo) return 'SEM_PRAZO'
  if (agora.getTime() > prazo.getTime() && !concluido) return 'ATRASADO'
  return 'EM_DIA'
}
