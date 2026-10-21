import type { ActivityStatus } from '../producao/tipos'
import {
  ItemNaoEncontradoError,
  SetorInvalidoError,
  type ItemParaClassificar,
} from './classificar-item'
import type { Sector } from './gerenciar-setores'
import { normalizarMotivoCorrecao, validarMotivoCorrecao } from './motivo-correcao'

/** Registros da atividade que podem impedir a troca de setor (AD-006, AD-007). */
export interface RegistrosDaAtividade {
  status: ActivityStatus
  execucoes: number
  ocorrencias: number
  entregas: number
}

/** Atividade do item (item × setor) com a contagem dos registros que travam a correção. */
export interface AtividadeDoItem extends RegistrosDaAtividade {
  id: string
  itemId: string
  sectorId: string
  sectorCode: string
  sectorName: string
}

/** Setor como aparece na trilha de auditoria. */
export interface SetorAuditavel {
  id: string
  code: string
  name: string
}

export interface TrocaSetorInput {
  atividadeId: string
  itemId: string
  setorAnterior: SetorAuditavel
  setorNovo: SetorAuditavel
  userId: string
  motivo: string | null
}

export interface CorrecaoSetorRepository {
  /** Item do pedido, ou null se não existir. */
  findItemById(itemId: string): Promise<ItemParaClassificar | null>
  /** Setor pelo id, ativo ou inativo, ou null se não existir. */
  findSectorById(sectorId: string): Promise<Sector | null>
  /** Atividade do item, ou null se o item não tiver atividade. */
  findActivityByItemId(itemId: string): Promise<AtividadeDoItem | null>
  /**
   * Troca o setor da atividade e grava a auditoria na mesma transação, somente
   * se a atividade continuar sem registros operacionais. Retorna `false` quando
   * a condição não se mantém (registro criado entre a leitura e a gravação).
   */
  trocarSetorDaAtividade(input: TrocaSetorInput): Promise<boolean>
}

/**
 * Motivo que impede a correção de setor, ou null quando ela é permitida. Usado
 * pelo servidor e pela leitura do pedido, para a interface antecipar o bloqueio.
 */
export function motivoBloqueioCorrecao(registros: RegistrosDaAtividade | null): string | null {
  if (registros === null) return 'O item ainda não possui atividade de produção.'
  if (registros.entregas > 0) return 'O item já possui entrega registrada.'
  if (registros.execucoes > 0) return 'O item já possui execução registrada.'
  if (registros.ocorrencias > 0) return 'O item já possui ocorrência registrada.'
  if (registros.status !== 'PENDING') return 'A produção deste item já foi iniciada.'
  return null
}

export class ItemNaoClassificadoError extends Error {
  constructor(itemId: string) {
    super(`Item ainda não foi desmembrado: ${itemId}`)
    this.name = 'ItemNaoClassificadoError'
  }
}

export class RegistrosOperacionaisError extends Error {
  /** Texto para o usuário explicando o bloqueio. */
  readonly motivoBloqueio: string

  constructor(itemId: string, motivoBloqueio: string) {
    super(`Item possui registros operacionais e não pode mudar de setor: ${itemId}`)
    this.name = 'RegistrosOperacionaisError'
    this.motivoBloqueio = motivoBloqueio
  }
}

export class MotivoObrigatorioError extends Error {
  constructor() {
    super('Informe o motivo da correção de setor')
    this.name = 'MotivoObrigatorioError'
  }
}

export class MotivoExcedeLimiteError extends Error {
  constructor() {
    super('O motivo da correção deve ter no máximo 500 caracteres')
    this.name = 'MotivoExcedeLimiteError'
  }
}

export interface CorrigirSetorInput {
  itemId: string
  sectorId: string
  motivo: string | null
  /** Gerente e responsável pelo sistema informam o motivo; vendedor não. */
  exigeMotivo: boolean
  userId: string
}

export interface CorrigirSetorResult {
  status: 'CLASSIFIED'
  sectorId: string
  activityId: string
  alterado: boolean
}

/**
 * Corrige o setor de um item já desmembrado. A correção só é aceita enquanto
 * o item não tiver execução, ocorrência, entrega ou atividade iniciada; caso
 * contrário responde conflito, para não deixar registros órfãos no setor antigo.
 */
export async function corrigirSetorItem(
  input: CorrigirSetorInput,
  repo: CorrecaoSetorRepository,
): Promise<CorrigirSetorResult> {
  const item = await repo.findItemById(input.itemId)
  if (!item) throw new ItemNaoEncontradoError(input.itemId)
  if (item.classificationStatus !== 'CLASSIFIED') throw new ItemNaoClassificadoError(input.itemId)

  const erroMotivo = validarMotivoCorrecao(input.motivo, input.exigeMotivo)
  if (erroMotivo === 'reason_required') throw new MotivoObrigatorioError()
  if (erroMotivo === 'reason_too_long') throw new MotivoExcedeLimiteError()
  const motivo = normalizarMotivoCorrecao(input.motivo)

  const sector = await repo.findSectorById(input.sectorId)
  if (!sector || !sector.active) throw new SetorInvalidoError(input.sectorId)

  const atividade = await repo.findActivityByItemId(input.itemId)
  if (!atividade) throw new ItemNaoClassificadoError(input.itemId)

  if (atividade.sectorId === input.sectorId) {
    return {
      status: 'CLASSIFIED',
      sectorId: atividade.sectorId,
      activityId: atividade.id,
      alterado: false,
    }
  }

  const bloqueio = motivoBloqueioCorrecao(atividade)
  if (bloqueio !== null) throw new RegistrosOperacionaisError(input.itemId, bloqueio)

  const trocado = await repo.trocarSetorDaAtividade({
    atividadeId: atividade.id,
    itemId: input.itemId,
    setorAnterior: {
      id: atividade.sectorId,
      code: atividade.sectorCode,
      name: atividade.sectorName,
    },
    setorNovo: { id: sector.id, code: sector.code, name: sector.name },
    userId: input.userId,
    motivo,
  })
  if (!trocado) {
    throw new RegistrosOperacionaisError(
      input.itemId,
      'Um registro operacional foi criado durante a correção.',
    )
  }

  return {
    status: 'CLASSIFIED',
    sectorId: input.sectorId,
    activityId: atividade.id,
    alterado: true,
  }
}
