/** Entregas programadas (remessas) de um item: data prevista e confirmação. */

export interface Remessa {
  id: string
  orderItemId: string
  remessa: number
  scheduledAt: Date
  confirmedAt: Date | null
  note: string | null
}

export interface RemessaRepository {
  listarPorItem(orderItemId: string): Promise<Remessa[]>
  listarPorPedido(orderId: string): Promise<Remessa[]>
  buscar(id: string): Promise<Remessa | null>
  buscarPorNumero(orderItemId: string, remessa: number): Promise<Remessa | null>
  criar(input: {
    orderItemId: string
    remessa: number
    scheduledAt: Date
    note: string | null
  }): Promise<Remessa>
  confirmar(id: string, now: Date): Promise<Remessa | null>
  remover(id: string): Promise<boolean>
}

export class RemessaDuplicadaError extends Error {
  constructor(remessa: number) {
    super(`Já existe a remessa ${remessa} para este item`)
    this.name = 'RemessaDuplicadaError'
  }
}

export class RemessaNaoEncontradaError extends Error {
  constructor(id: string) {
    super(`Remessa não encontrada: ${id}`)
    this.name = 'RemessaNaoEncontradaError'
  }
}

export class RemessaInvalidaError extends Error {
  constructor(motivo: string) {
    super(motivo)
    this.name = 'RemessaInvalidaError'
  }
}

/**
 * Programa uma remessa (entrega prevista) de um item: número da remessa (1ª, 2ª…)
 * e data. Rejeita número repetido para o mesmo item.
 */
export async function programarRemessa(
  input: { orderItemId: string; remessa: number; scheduledAt: Date; note?: string | null },
  repo: RemessaRepository,
): Promise<Remessa> {
  if (!Number.isInteger(input.remessa) || input.remessa <= 0) {
    throw new RemessaInvalidaError('O número da remessa deve ser um inteiro positivo')
  }
  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new RemessaInvalidaError('Data prevista inválida')
  }

  const existente = await repo.buscarPorNumero(input.orderItemId, input.remessa)
  if (existente) throw new RemessaDuplicadaError(input.remessa)

  return repo.criar({
    orderItemId: input.orderItemId,
    remessa: input.remessa,
    scheduledAt: input.scheduledAt,
    note: input.note ?? null,
  })
}

/** Confirma a remessa como entregue (marca a data de confirmação). */
export async function confirmarRemessa(
  input: { id: string; now: Date },
  repo: RemessaRepository,
): Promise<Remessa> {
  const confirmada = await repo.confirmar(input.id, input.now)
  if (!confirmada) throw new RemessaNaoEncontradaError(input.id)
  return confirmada
}

/** Remove uma remessa programada. */
export async function removerRemessa(
  input: { id: string },
  repo: RemessaRepository,
): Promise<void> {
  const removida = await repo.remover(input.id)
  if (!removida) throw new RemessaNaoEncontradaError(input.id)
}
