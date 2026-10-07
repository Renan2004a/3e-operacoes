import { calcularSaldo, type Saldo } from './saldo'
import type { ActivityStatus } from './tipos'
import { validarQuantidade, type Quantidade } from './unidades'

export interface AtividadeParaExecucao {
  id: string
  sectorId: string
  unidade: string
  solicitado: Quantidade
}

export interface Execucao {
  id: string
  activityId: string
  userId: string
  quantidade: Quantidade
  occurredAt: Date
}

export interface RegistrarExecucaoPortInput {
  atividadeId: string
  usuarioId: string
  quantidade: Quantidade
  occurredAt: Date
  /** Decide o status a partir da soma das execuções calculada dentro da transação. */
  resolverStatus: (executadoTotal: Quantidade) => ActivityStatus
}

export interface RegistrarExecucaoPortResult {
  execucao: Execucao
  /** Soma das execuções da atividade após a inserção, na mesma transação. */
  executadoTotal: Quantidade
  status: ActivityStatus
}

export interface ExecucaoRepository {
  /** Atividade com a unidade e o solicitado do item, ou null se não existir. */
  buscarAtividadeParaExecucao(atividadeId: string): Promise<AtividadeParaExecucao | null>
  /** Indica se o usuário pertence ao setor informado (RF003). */
  usuarioPertenceAoSetor(usuarioId: string, sectorId: string): Promise<boolean>
  /** Insere a execução, soma as execuções e atualiza o status na mesma transação. */
  registrarExecucao(input: RegistrarExecucaoPortInput): Promise<RegistrarExecucaoPortResult>
}

export class AtividadeNaoEncontradaError extends Error {
  constructor(atividadeId: string) {
    super(`Atividade não encontrada: ${atividadeId}`)
    this.name = 'AtividadeNaoEncontradaError'
  }
}

export class OperadorForaDoSetorError extends Error {
  constructor(usuarioId: string, sectorId: string) {
    super(`Usuário ${usuarioId} não pertence ao setor ${sectorId}`)
    this.name = 'OperadorForaDoSetorError'
  }
}

/** Status após uma execução: ultrapassou → DIVERGENT; alcançou → COMPLETED; senão IN_PROGRESS (RN001). */
export function resolverStatusExecucao(
  solicitado: Quantidade,
  executadoTotal: Quantidade,
): ActivityStatus {
  if (executadoTotal.gt(solicitado)) return 'DIVERGENT'
  if (executadoTotal.gte(solicitado)) return 'COMPLETED'
  return 'IN_PROGRESS'
}

export interface RegistrarExecucaoInput {
  atividadeId: string
  usuarioId: string
  quantidade: Quantidade | string | number
  occurredAt?: Date
}

export interface RegistrarExecucaoResult {
  execucao: Execucao
  status: ActivityStatus
  saldo: Saldo
}

/**
 * Registra a execução do operador: valida a atividade, o setor e a unidade,
 * persiste com usuário e data/hora e atualiza o status da atividade (PROD-04..07,14,15).
 */
export async function registrarExecucao(
  input: RegistrarExecucaoInput,
  repo: ExecucaoRepository,
): Promise<RegistrarExecucaoResult> {
  const atividade = await repo.buscarAtividadeParaExecucao(input.atividadeId)
  if (!atividade) throw new AtividadeNaoEncontradaError(input.atividadeId)

  const pertence = await repo.usuarioPertenceAoSetor(input.usuarioId, atividade.sectorId)
  if (!pertence) throw new OperadorForaDoSetorError(input.usuarioId, atividade.sectorId)

  const quantidade = validarQuantidade(atividade.unidade, input.quantidade)
  const occurredAt = input.occurredAt ?? new Date()

  const { execucao, executadoTotal, status } = await repo.registrarExecucao({
    atividadeId: input.atividadeId,
    usuarioId: input.usuarioId,
    quantidade,
    occurredAt,
    resolverStatus: (total) => resolverStatusExecucao(atividade.solicitado, total),
  })

  const saldo = calcularSaldo({ solicitado: atividade.solicitado, executado: executadoTotal })

  return { execucao, status, saldo }
}
