import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { OcorrenciaListada } from '../listar-ocorrencias'
import type { MotivoOcorrencia, TipoOcorrencia } from '../motivos'
import type {
  AtividadeParaOcorrencia,
  Ocorrencia,
  OcorrenciaRepository,
} from '../registrar-ocorrencia'

/**
 * Porta única de ocorrências: as portas de motivos e registro mais a listagem.
 * `OcorrenciaRepository` já estende `MotivoRepository`.
 */
export interface OcorrenciasRepository extends OcorrenciaRepository {
  /** Ocorrências da atividade, com motivo, quantidade, observação e data/hora. */
  listarOcorrencias(atividadeId: string): Promise<OcorrenciaListada[]>
}

interface MotivoRow {
  id: string
  tipo: string
  codigo: string
  descricao: string
  ativo: boolean
}

interface OcorrenciaRow {
  id: string
  activityId: string
  userId: string
  type: string
  quantity: Prisma.Decimal | null
  durationMin: number | null
  motivoId: string | null
  note: string | null
  occurredAt: Date
}

function toMotivo(row: MotivoRow): MotivoOcorrencia {
  return {
    id: row.id,
    tipo: row.tipo as TipoOcorrencia,
    codigo: row.codigo,
    descricao: row.descricao,
    ativo: row.ativo,
  }
}

function toOcorrencia(row: OcorrenciaRow): Ocorrencia {
  return {
    id: row.id,
    activityId: row.activityId,
    userId: row.userId,
    tipo: row.type as TipoOcorrencia,
    quantidade: row.quantity,
    duracaoMin: row.durationMin,
    motivoId: row.motivoId,
    observacao: row.note,
    occurredAt: row.occurredAt,
  }
}

/** Implementação Prisma da porta `OcorrenciasRepository`. */
export const prismaOcorrenciasRepository: OcorrenciasRepository = {
  async listarMotivosPorTipo(tipo) {
    const rows = await prisma.motivoOcorrencia.findMany({
      where: { tipo },
      orderBy: { codigo: 'asc' },
    })
    return rows.map(toMotivo)
  },

  async buscarMotivoPorId(motivoId) {
    const row = await prisma.motivoOcorrencia.findUnique({ where: { id: motivoId } })
    return row ? toMotivo(row) : null
  },

  async buscarAtividadeParaOcorrencia(atividadeId): Promise<AtividadeParaOcorrencia | null> {
    const row = await prisma.activity.findUnique({
      where: { id: atividadeId },
      include: { orderItem: true },
    })
    if (!row) return null
    return {
      id: row.id,
      sectorId: row.sectorId,
      unidade: row.orderItem.unit,
    }
  },

  async usuarioPertenceAoSetor(usuarioId, sectorId) {
    const row = await prisma.userSector.findUnique({
      where: { userId_sectorId: { userId: usuarioId, sectorId } },
    })
    return row !== null
  },

  async registrarOcorrencia(input): Promise<Ocorrencia> {
    const row = await prisma.occurrence.create({
      data: {
        activityId: input.atividadeId,
        userId: input.usuarioId,
        type: input.tipo,
        quantity: input.quantidade,
        durationMin: input.duracaoMin,
        motivoId: input.motivoId,
        note: input.observacao,
        occurredAt: input.occurredAt,
      },
    })
    return toOcorrencia(row)
  },

  async listarOcorrencias(atividadeId): Promise<OcorrenciaListada[]> {
    const rows = await prisma.occurrence.findMany({
      where: { activityId: atividadeId },
      include: { motivo: true },
      orderBy: { occurredAt: 'asc' },
    })
    return rows.map((row) => ({
      id: row.id,
      tipo: row.type as TipoOcorrencia,
      quantidade: row.quantity,
      duracaoMin: row.durationMin,
      motivo: row.motivo ? toMotivo(row.motivo) : null,
      observacao: row.note,
      occurredAt: row.occurredAt,
    }))
  },
}
