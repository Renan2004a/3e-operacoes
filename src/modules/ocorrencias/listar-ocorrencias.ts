import { AtividadeNaoEncontradaError } from '../producao/registrar-execucao'
import type { Quantidade } from '../producao/unidades'
import type { MotivoOcorrencia, TipoOcorrencia } from './motivos'

export interface OcorrenciaListada {
  id: string
  tipo: TipoOcorrencia
  quantidade: Quantidade | null
  duracaoMin: number | null
  motivo: MotivoOcorrencia | null
  observacao: string | null
  occurredAt: Date
}

export interface ListarOcorrenciasRepository {
  /** Atividade pelo id, ou null se não existir. */
  buscarAtividadeParaOcorrencia(atividadeId: string): Promise<{ id: string } | null>
  /** Ocorrências da atividade, com motivo, quantidade, observação e data/hora. */
  listarOcorrencias(atividadeId: string): Promise<OcorrenciaListada[]>
}

/**
 * Lista as ocorrências de uma atividade (OCO-07). Atividade inexistente é
 * rejeitada (OCO-10).
 */
export async function listarOcorrencias(
  atividadeId: string,
  repo: ListarOcorrenciasRepository,
): Promise<OcorrenciaListada[]> {
  const atividade = await repo.buscarAtividadeParaOcorrencia(atividadeId)
  if (!atividade) throw new AtividadeNaoEncontradaError(atividadeId)
  return repo.listarOcorrencias(atividadeId)
}
