import type { ActivityStatus } from './tipos'

export interface Atividade {
  id: string
  orderItemId: string
  sectorId: string
  status: ActivityStatus
  priority: number
  createdAt: Date
  /** Descrição do item, para exibição (evita mostrar o CUID). */
  itemDescription?: string | null
  /** Código do produto, fallback de exibição. */
  productCode?: string | null
  /** Número do pedido no legado, para exibição. */
  orderNumber?: string | null
  /** Nome do setor, para exibição. */
  sectorName?: string | null
}

export interface FilaRepository {
  /** Ids dos setores aos quais o usuário pertence (RF003). */
  listarSetoresDoUsuario(usuarioId: string): Promise<string[]>
  /** Atividades dos setores informados. */
  listarAtividadesPorSetores(sectorIds: string[]): Promise<Atividade[]>
}

/**
 * Fila de atividades do operador: apenas os setores aos quais ele pertence,
 * ordenadas por prioridade decrescente e, depois, por criação (PROD-01..03).
 */
export async function listarFila(usuarioId: string, repo: FilaRepository): Promise<Atividade[]> {
  const setores = await repo.listarSetoresDoUsuario(usuarioId)
  if (setores.length === 0) return []

  const atividades = await repo.listarAtividadesPorSetores(setores)
  return [...atividades].sort(
    (a, b) => b.priority - a.priority || a.createdAt.getTime() - b.createdAt.getTime(),
  )
}
