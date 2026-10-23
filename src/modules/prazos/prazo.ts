import { fimDoDiaNoFuso } from '../../shared/time/dia-do-periodo'

/** Prazo persistido, com a data efetiva em UTC (PRAZO-01, PRAZO-02). */
export interface PrazoDefinido {
  id: string
  deadlineAt: Date
}

/** Porta de persistência do prazo de item e de atividade (PRAZO-01, PRAZO-02). */
export interface PrazoRepository {
  /** Grava `OrderItem.deadlineAt`; null quando o item não existe (PRAZO-12). */
  definirPrazoItem(input: { itemId: string; prazo: Date }): Promise<PrazoDefinido | null>
  /** Grava `Activity.deadlineAt`; null quando a atividade não existe (PRAZO-11). */
  definirPrazoAtividade(input: { atividadeId: string; prazo: Date }): Promise<PrazoDefinido | null>
}

/** Data de prazo ausente ou não interpretável (HTTP 400, PRAZO-04). */
export class PrazoInvalidoError extends Error {
  constructor() {
    super('Data de prazo inválida')
    this.name = 'PrazoInvalidoError'
  }
}

export class ItemNaoEncontradoError extends Error {
  constructor(itemId: string) {
    super(`Item não encontrado: ${itemId}`)
    this.name = 'ItemNaoEncontradoError'
  }
}

export class AtividadeNaoEncontradaError extends Error {
  constructor(atividadeId: string) {
    super(`Atividade não encontrada: ${atividadeId}`)
    this.name = 'AtividadeNaoEncontradaError'
  }
}

/**
 * Converte o valor recebido em uma data de prazo válida (PRAZO-04, D2).
 *
 * Texto só é aceito no formato de dia civil `YYYY-MM-DD` e é ancorado no
 * **fim do dia** em `America/Sao_Paulo`; um prazo para hoje não é atrasado.
 * Formatos ambíguos (`01/02/2026`), datas inexistentes (`2026-02-30`) e
 * timestamps completos são rejeitados. Um `Date` já resolvido é aceito como
 * está (uso interno e testes), desde que seja um instante válido.
 */
export function validarPrazo(valor: unknown): Date {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) throw new PrazoInvalidoError()
    return valor
  }

  if (typeof valor !== 'string') throw new PrazoInvalidoError()

  const prazo = fimDoDiaNoFuso(valor.trim())
  if (!prazo) throw new PrazoInvalidoError()

  return prazo
}

/** Define o prazo do item, validando a data e a existência (PRAZO-01, PRAZO-04, PRAZO-12). */
export async function definirPrazoItem(
  input: { itemId: string; prazo: unknown },
  repo: PrazoRepository,
): Promise<PrazoDefinido> {
  const prazo = validarPrazo(input.prazo)
  const item = await repo.definirPrazoItem({ itemId: input.itemId, prazo })
  if (!item) throw new ItemNaoEncontradoError(input.itemId)
  return item
}

/**
 * Define o prazo da atividade, validando a data e a existência
 * (PRAZO-02, PRAZO-04, PRAZO-11).
 */
export async function definirPrazoAtividade(
  input: { atividadeId: string; prazo: unknown },
  repo: PrazoRepository,
): Promise<PrazoDefinido> {
  const prazo = validarPrazo(input.prazo)
  const atividade = await repo.definirPrazoAtividade({ atividadeId: input.atividadeId, prazo })
  if (!atividade) throw new AtividadeNaoEncontradaError(input.atividadeId)
  return atividade
}
