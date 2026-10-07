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
  definirPrazoAtividade(input: {
    atividadeId: string
    prazo: Date
  }): Promise<PrazoDefinido | null>
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
 * Converte o valor recebido em uma data válida. Ausente, vazia ou não
 * interpretável é rejeitada (PRAZO-04).
 */
export function validarPrazo(valor: unknown): Date {
  if (valor === null || valor === undefined || valor === '') throw new PrazoInvalidoError()

  const data = valor instanceof Date ? valor : new Date(String(valor))
  if (Number.isNaN(data.getTime())) throw new PrazoInvalidoError()

  return data
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
