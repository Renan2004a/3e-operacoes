/** Tipos de ocorrência (RF005). */
export const TIPOS_OCORRENCIA = [
  'PERDA',
  'REFUGO',
  'INDISPONIBILIDADE',
  'PAUSA',
  'PARADA',
  'DEFEITO',
] as const

export type TipoOcorrencia = (typeof TIPOS_OCORRENCIA)[number]

/** Tipos que exigem motivo válido (RN012, RN023, RN032). */
export const TIPOS_COM_MOTIVO: readonly TipoOcorrencia[] = [
  'PERDA',
  'REFUGO',
  'INDISPONIBILIDADE',
]

export interface MotivoOcorrencia {
  id: string
  tipo: TipoOcorrencia
  codigo: string
  descricao: string
  ativo: boolean
}

export interface MotivoRepository {
  /** Motivos de um tipo, ativos e inativos (o domínio seleciona os ativos). */
  listarMotivosPorTipo(tipo: TipoOcorrencia): Promise<MotivoOcorrencia[]>
  /** Motivo pelo id, ou null se não existir. */
  buscarMotivoPorId(motivoId: string): Promise<MotivoOcorrencia | null>
}

export class TipoOcorrenciaInvalidoError extends Error {
  constructor(tipo: string) {
    super(`Tipo de ocorrência inválido: ${tipo}`)
    this.name = 'TipoOcorrenciaInvalidoError'
  }
}

export class MotivoInvalidoError extends Error {
  constructor(tipo: TipoOcorrencia, motivoId: string) {
    super(`Motivo inválido para ${tipo}: ${motivoId}`)
    this.name = 'MotivoInvalidoError'
  }
}

export function ehTipoOcorrencia(valor: string): valor is TipoOcorrencia {
  return (TIPOS_OCORRENCIA as readonly string[]).includes(valor)
}

/**
 * Lista os motivos ativos de um tipo (OCO-08). Tipo desconhecido é rejeitado,
 * para a rota responder `400` em vez de uma lista vazia silenciosa.
 */
export async function listarMotivos(
  tipo: string,
  repo: MotivoRepository,
): Promise<MotivoOcorrencia[]> {
  if (!ehTipoOcorrencia(tipo)) throw new TipoOcorrenciaInvalidoError(tipo)
  const motivos = await repo.listarMotivosPorTipo(tipo)
  return motivos.filter((motivo) => motivo.ativo)
}

/** Aceita apenas motivo cadastrado, ativo e do mesmo tipo da ocorrência (OCO-09). */
export async function validarMotivo(
  tipo: TipoOcorrencia,
  motivoId: string,
  repo: MotivoRepository,
): Promise<MotivoOcorrencia> {
  const motivo = await repo.buscarMotivoPorId(motivoId)
  if (!motivo || !motivo.ativo || motivo.tipo !== tipo) {
    throw new MotivoInvalidoError(tipo, motivoId)
  }
  return motivo
}

export interface MotivoSugerido {
  tipo: TipoOcorrencia
  codigo: string
  descricao: string
  /**
   * Carga inicial sugerida pela IA a partir de `docs/backlog/motivos-ocorrencia.md`.
   * Não é regra definitiva: aguarda validação do Everton antes de virar lista fechada.
   */
  sugestao: true
}

/** As 3 sugestões iniciais por tipo (perda, refugo, indisponibilidade). */
export const MOTIVOS_SUGERIDOS: readonly MotivoSugerido[] = [
  { tipo: 'PERDA', codigo: 'DEFEITO_CORTE', descricao: 'Defeito de corte', sugestao: true },
  {
    tipo: 'PERDA',
    codigo: 'MATERIAL_COM_PROBLEMA',
    descricao: 'Material com problema',
    sugestao: true,
  },
  {
    tipo: 'PERDA',
    codigo: 'ERRO_DOBRA_MEDIDA',
    descricao: 'Erro de dobra / medida incorreta',
    sugestao: true,
  },
  { tipo: 'REFUGO', codigo: 'CORTE_ERRADO', descricao: 'Corte errado', sugestao: true },
  { tipo: 'REFUGO', codigo: 'DEFEITO_CHAPA', descricao: 'Defeito de chapa', sugestao: true },
  {
    tipo: 'REFUGO',
    codigo: 'COMPRIMENTO_AJUSTE',
    descricao: 'Comprimento/ajuste incorreto',
    sugestao: true,
  },
  { tipo: 'INDISPONIBILIDADE', codigo: 'SEM_ESTOQUE', descricao: 'Sem estoque', sugestao: true },
  {
    tipo: 'INDISPONIBILIDADE',
    codigo: 'ITEM_DESCONTINUADO',
    descricao: 'Item descontinuado',
    sugestao: true,
  },
  {
    tipo: 'INDISPONIBILIDADE',
    codigo: 'SALDO_INSUFICIENTE',
    descricao: 'Saldo insuficiente para a quantidade solicitada',
    sugestao: true,
  },
]
