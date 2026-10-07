import { AtividadeNaoEncontradaError } from './registrar-execucao'
import { calcularSaldo } from './saldo'
import { formatarQuantidade, type Quantidade } from './unidades'

export interface DadosOrdemProducao {
  atividadeId: string
  /** Número do pedido no legado. */
  pedido: string
  /** Descrição/código do item do pedido. */
  item: string
  /** Nome do setor. */
  setor: string
  unidade: string
  solicitado: Quantidade
  executado: Quantidade
}

export interface OrdemProducao extends DadosOrdemProducao {
  pendente: Quantidade
}

export interface OrdemProducaoRepository {
  /** Dados de impressão da atividade, ou null se não existir. */
  buscarOrdemProducao(atividadeId: string): Promise<DadosOrdemProducao | null>
}

/**
 * Monta os dados da ordem de produção (RF018): pedido, item, setor, solicitado,
 * executado e pendente (PROD-12). Atividade inexistente é rejeitada (PROD-13).
 */
export async function montarOrdemProducao(
  atividadeId: string,
  repo: OrdemProducaoRepository,
): Promise<OrdemProducao> {
  const dados = await repo.buscarOrdemProducao(atividadeId)
  if (!dados) throw new AtividadeNaoEncontradaError(atividadeId)

  const { pendente } = calcularSaldo({ solicitado: dados.solicitado, executado: dados.executado })
  return { ...dados, pendente }
}

/** Pendente formatado conforme a unidade do item (peça inteira, metro 2 casas). */
export function formatarPendenteOrdem(ordem: OrdemProducao): string {
  return formatarQuantidade(ordem.unidade, ordem.pendente)
}
