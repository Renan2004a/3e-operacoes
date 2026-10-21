/** Limite do motivo de correção de setor, em pontos de código Unicode (AD-007). */
export const LIMITE_MOTIVO_CORRECAO = 500

export type ErroMotivoCorrecao = 'reason_required' | 'reason_too_long'

/**
 * Motivo como será gravado: sem espaços nas bordas, ou null quando vazio.
 * Mesma regra no servidor e na interface para evitar divergências (AD-007).
 */
export function normalizarMotivoCorrecao(motivo: string | null | undefined): string | null {
  const limpo = motivo?.trim() ?? ''
  return limpo === '' ? null : limpo
}

/** Conta pontos de código Unicode: um emoji simples vale 1 caractere (AD-007). */
export function contarCaracteresMotivo(motivo: string): number {
  return [...motivo].length
}

/**
 * Valida o motivo da correção. Obrigatório quando `exigido`; nunca pode exceder
 * `LIMITE_MOTIVO_CORRECAO` caracteres após normalização.
 */
export function validarMotivoCorrecao(
  motivo: string | null | undefined,
  exigido: boolean,
): ErroMotivoCorrecao | null {
  const normalizado = normalizarMotivoCorrecao(motivo)
  if (normalizado === null) return exigido ? 'reason_required' : null
  if (contarCaracteresMotivo(normalizado) > LIMITE_MOTIVO_CORRECAO) return 'reason_too_long'
  return null
}
