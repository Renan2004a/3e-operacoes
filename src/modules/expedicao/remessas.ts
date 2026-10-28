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
 * Interpreta a data prevista vinda do formulário. Datas "somente dia"
 * (`YYYY-MM-DD`) são ancoradas ao meio-dia de São Paulo, para não "voltar um
 * dia" ao exibir em `America/Sao_Paulo`. Demais formatos usam `new Date`.
 */
export function interpretarDataPrevista(valor: string): Date {
  const limpo = valor.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(limpo)) {
    return new Date(`${limpo}T12:00:00-03:00`)
  }
  return new Date(valor)
}

/**
 * Programa uma remessa (entrega prevista) de um item. O número é automático
 * (1ª, 2ª…), salvo quando informado explicitamente para compatibilidade.
 * Rejeita número repetido para o mesmo item.
 */
export async function programarRemessa(
  input: { orderItemId: string; remessa?: number; scheduledAt: Date; note?: string | null },
  repo: RemessaRepository,
): Promise<Remessa> {
  if (!Number.isInteger(input.remessa ?? 1) || (input.remessa !== undefined && input.remessa <= 0)) {
    throw new RemessaInvalidaError('O número da remessa deve ser um inteiro positivo')
  }
  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new RemessaInvalidaError('Data prevista inválida')
  }

  // Número automático: duas pessoas no mesmo item podem calcular o mesmo
  // "próximo". A violação da chave única é traduzida em RemessaDuplicadaError
  // e a operação recalcula o número (até 3 tentativas) em vez de estourar 500.
  if (input.remessa === undefined) {
    for (let tentativa = 1; tentativa <= 3; tentativa += 1) {
      const existentes = await repo.listarPorItem(input.orderItemId)
      const proxima =
        existentes.reduce((maior, remessa) => Math.max(maior, remessa.remessa), 0) + 1
      try {
        return await repo.criar({
          orderItemId: input.orderItemId,
          remessa: proxima,
          scheduledAt: input.scheduledAt,
          note: input.note ?? null,
        })
      } catch (erro) {
        if (!(erro instanceof RemessaDuplicadaError) || tentativa === 3) throw erro
      }
    }
  }

  const numero = input.remessa as number
  const existente = await repo.buscarPorNumero(input.orderItemId, numero)
  if (existente) throw new RemessaDuplicadaError(numero)

  return repo.criar({
    orderItemId: input.orderItemId,
    remessa: numero,
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
