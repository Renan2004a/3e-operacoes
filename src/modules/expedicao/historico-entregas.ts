import type { Quantidade } from '../producao/unidades'
import { ItemNaoEncontradoError } from './registrar-entrega'

export interface EntregaHistorico {
  id: string
  quantidade: Quantidade
  usuarioId: string
  usuarioNome: string
  occurredAt: Date
  /** Indica se a entrega foi autorizada como exceção acima do disponível. */
  excecao: boolean
}

export interface HistoricoEntregasRepository {
  /** Item pelo id, ou null se não existir (EXP-12). */
  buscarItemParaHistorico(itemId: string): Promise<{ id: string } | null>
  /** Entregas do item, com quantidade, autor, data/hora e exceção. */
  listarEntregas(itemId: string): Promise<EntregaHistorico[]>
}

/**
 * Lista o histórico de entregas de um item (RF010, EXP-11): quantidade, autor,
 * data/hora e se houve exceção. Item inexistente é rejeitado (EXP-12).
 */
export async function listarEntregas(
  itemId: string,
  repo: HistoricoEntregasRepository,
): Promise<EntregaHistorico[]> {
  const item = await repo.buscarItemParaHistorico(itemId)
  if (!item) throw new ItemNaoEncontradoError(itemId)
  return repo.listarEntregas(itemId)
}
