import {
  AtividadeNaoEncontradaError,
  OperadorForaDoSetorError,
} from '../producao/registrar-execucao'
import { validarQuantidade, type Quantidade } from '../producao/unidades'
import {
  TIPOS_COM_MOTIVO,
  validarMotivo,
  type MotivoRepository,
  type TipoOcorrencia,
} from './motivos'

export interface AtividadeParaOcorrencia {
  id: string
  sectorId: string
  unidade: string
}

export interface Ocorrencia {
  id: string
  activityId: string
  userId: string
  tipo: TipoOcorrencia
  quantidade: Quantidade | null
  duracaoMin: number | null
  motivoId: string | null
  observacao: string | null
  occurredAt: Date
}

export interface RegistrarOcorrenciaPortInput {
  atividadeId: string
  usuarioId: string
  tipo: TipoOcorrencia
  quantidade: Quantidade | null
  duracaoMin: number | null
  motivoId: string | null
  observacao: string | null
  occurredAt: Date
}

export interface OcorrenciaRepository extends MotivoRepository {
  /** Atividade com a unidade do item, ou null se não existir. */
  buscarAtividadeParaOcorrencia(atividadeId: string): Promise<AtividadeParaOcorrencia | null>
  /** Indica se o usuário pertence ao setor informado (RF003). */
  usuarioPertenceAoSetor(usuarioId: string, sectorId: string): Promise<boolean>
  /** Persiste a ocorrência e retorna o registro criado. */
  registrarOcorrencia(input: RegistrarOcorrenciaPortInput): Promise<Ocorrencia>
}

export class MotivoObrigatorioError extends Error {
  constructor(tipo: TipoOcorrencia) {
    super(`Motivo é obrigatório para ocorrência do tipo ${tipo}`)
    this.name = 'MotivoObrigatorioError'
  }
}

export interface RegistrarOcorrenciaInput {
  atividadeId: string
  usuarioId: string
  tipo: TipoOcorrencia
  quantidade?: Quantidade | string | number | null
  duracaoMin?: number | null
  motivoId?: string | null
  observacao?: string | null
  occurredAt?: Date
}

/**
 * Registra perda, refugo, indisponibilidade, pausa e parada (OCO-01..06,11,13).
 * Perda/refugo/indisponibilidade exigem motivo ativo do mesmo tipo (RN012,
 * RN023, RN032); pausa/parada aceitam duração sem motivo. A porta não expõe
 * nenhuma escrita de produção, então perda/refugo não alteram o saldo (OCO-05).
 */
export async function registrarOcorrencia(
  input: RegistrarOcorrenciaInput,
  repo: OcorrenciaRepository,
): Promise<Ocorrencia> {
  const atividade = await repo.buscarAtividadeParaOcorrencia(input.atividadeId)
  if (!atividade) throw new AtividadeNaoEncontradaError(input.atividadeId)

  const pertence = await repo.usuarioPertenceAoSetor(input.usuarioId, atividade.sectorId)
  if (!pertence) throw new OperadorForaDoSetorError(input.usuarioId, atividade.sectorId)

  const exigeMotivo = TIPOS_COM_MOTIVO.includes(input.tipo)
  const motivoId = input.motivoId ?? null
  if (exigeMotivo) {
    if (!motivoId) throw new MotivoObrigatorioError(input.tipo)
    await validarMotivo(input.tipo, motivoId, repo)
  } else if (motivoId) {
    await validarMotivo(input.tipo, motivoId, repo)
  }

  const informouQuantidade = input.quantidade !== undefined && input.quantidade !== null
  const quantidade =
    informouQuantidade || exigeMotivo
      ? validarQuantidade(atividade.unidade, input.quantidade ?? '')
      : null

  return repo.registrarOcorrencia({
    atividadeId: input.atividadeId,
    usuarioId: input.usuarioId,
    tipo: input.tipo,
    quantidade,
    duracaoMin: input.duracaoMin ?? null,
    motivoId,
    observacao: input.observacao ?? null,
    occurredAt: input.occurredAt ?? new Date(),
  })
}
