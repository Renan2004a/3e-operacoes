import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { OcorrenciaListada } from '../listar-ocorrencias'
import type { MotivoOcorrencia, TipoOcorrencia } from '../motivos'
import type {
  OcorrenciaDetalhada,
  OcorrenciasPainelRepository,
} from '../painel-ocorrencias'
import type {
  AtividadeParaOcorrencia,
  Ocorrencia,
  OcorrenciaRepository,
} from '../registrar-ocorrencia'

/**
 * Porta única de ocorrências: as portas de motivos e registro mais a listagem.
 * `OcorrenciaRepository` já estende `MotivoRepository`.
 */
export interface OcorrenciasRepository
  extends OcorrenciaRepository,
    OcorrenciasPainelRepository {
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
    const row = await prisma.orderItem.findUnique({ where: { id: atividadeId } })
    if (!row || !row.sectorId) return null
    return {
      id: row.id,
      sectorId: row.sectorId,
      unidade: row.unit,
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
      where: { activityId: atividadeId, cancelledAt: null },
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

  async listarOcorrenciasDetalhadas({ usuarioId, limite = 100 } = {}): Promise<
    OcorrenciaDetalhada[]
  > {
    const rows = await prisma.occurrence.findMany({
      where: {
        cancelledAt: null,
        ...(usuarioId ? { userId: usuarioId } : {}),
      },
      select: {
        id: true,
        type: true,
        quantity: true,
        note: true,
        occurredAt: true,
        motivo: { select: { descricao: true } },
        user: { select: { name: true, roles: { select: { role: true } } } },
        activity: {
          select: {
            id: true,
            status: true,
            sector: { select: { name: true } },
            description: true,
            productCode: true,
            order: { select: { legacyNumber: true } },
          },
        },
      },
      orderBy: { occurredAt: 'desc' },
      take: limite,
    })

    return rows.map((row) => ({
      id: row.id,
      activityId: row.activity.id,
      tipo: row.type as TipoOcorrencia,
      quantidade: row.quantity,
      observacao: row.note,
      occurredAt: row.occurredAt,
      motivo: row.motivo?.descricao ?? null,
      pedido: row.activity.order.legacyNumber,
      item: row.activity.description ?? row.activity.productCode,
      setor: row.activity.sector?.name ?? '',
      usuario: row.user.name,
      perfil: row.user.roles[0]?.role ?? null,
      activityStatus: row.activity.status,
    }))
  },
}
