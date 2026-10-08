import { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { Atividade, FilaRepository } from '../fila'
import type {
  AtividadeParaExecucao,
  Execucao,
  ExecucaoRepository,
  RegistrarExecucaoPortResult,
} from '../registrar-execucao'
import type { PrioridadeRepository } from '../prioridade'
import type { DadosOrdemProducao, OrdemProducaoRepository } from '../ordem-producao'

/** Porta única de produção, composta pelas portas de cada caso de uso. */
export interface ProducaoRepository
  extends FilaRepository,
    ExecucaoRepository,
    PrioridadeRepository,
    OrdemProducaoRepository {}

interface AtividadeRow {
  id: string
  orderItemId: string
  sectorId: string
  status: Atividade['status']
  priority: number
  createdAt: Date
}

interface ExecucaoRow {
  id: string
  activityId: string
  userId: string
  quantity: Prisma.Decimal
  occurredAt: Date
}

function toAtividade(row: AtividadeRow): Atividade {
  return {
    id: row.id,
    orderItemId: row.orderItemId,
    sectorId: row.sectorId,
    status: row.status,
    priority: row.priority,
    createdAt: row.createdAt,
  }
}

function toExecucao(row: ExecucaoRow): Execucao {
  return {
    id: row.id,
    activityId: row.activityId,
    userId: row.userId,
    quantidade: row.quantity,
    occurredAt: row.occurredAt,
  }
}

function somarExecucoes(quantidades: Prisma.Decimal[]): Prisma.Decimal {
  return quantidades.reduce((total, valor) => total.plus(valor), new Prisma.Decimal(0))
}

/** Implementação Prisma da porta `ProducaoRepository`. */
export const prismaProducaoRepository: ProducaoRepository = {
  async listarSetoresDoUsuario(usuarioId) {
    const rows = await prisma.userSector.findMany({
      where: { userId: usuarioId },
      select: { sectorId: true },
    })
    return rows.map((row) => row.sectorId)
  },

  async listarAtividadesPorSetores(sectorIds) {
    if (sectorIds.length === 0) return []
    const rows = await prisma.activity.findMany({
      where: { sectorId: { in: sectorIds } },
      orderBy: { createdAt: 'asc' },
      include: {
        sector: { select: { name: true } },
        orderItem: {
          select: {
            description: true,
            productCode: true,
            order: { select: { legacyNumber: true } },
          },
        },
      },
    })
    return rows.map((row) => ({
      ...toAtividade(row),
      itemDescription: row.orderItem.description,
      productCode: row.orderItem.productCode,
      orderNumber: row.orderItem.order.legacyNumber,
      sectorName: row.sector.name,
    }))
  },

  async buscarAtividadeParaExecucao(atividadeId): Promise<AtividadeParaExecucao | null> {
    const row = await prisma.activity.findUnique({
      where: { id: atividadeId },
      include: { orderItem: true },
    })
    if (!row) return null
    return {
      id: row.id,
      sectorId: row.sectorId,
      unidade: row.orderItem.unit,
      solicitado: row.orderItem.requestedQuantity,
    }
  },

  async usuarioPertenceAoSetor(usuarioId, sectorId) {
    const row = await prisma.userSector.findUnique({
      where: { userId_sectorId: { userId: usuarioId, sectorId } },
    })
    return row !== null
  },

  async registrarExecucao(input): Promise<RegistrarExecucaoPortResult> {
    return prisma.$transaction(async (tx) => {
      const execucaoRow = await tx.execution.create({
        data: {
          activityId: input.atividadeId,
          userId: input.usuarioId,
          quantity: input.quantidade,
          occurredAt: input.occurredAt,
        },
      })
      const agregado = await tx.execution.aggregate({
        where: { activityId: input.atividadeId },
        _sum: { quantity: true },
      })
      const executadoTotal = agregado._sum.quantity ?? new Prisma.Decimal(0)
      const status = input.resolverStatus(executadoTotal)
      await tx.activity.update({ where: { id: input.atividadeId }, data: { status } })
      return { execucao: toExecucao(execucaoRow), executadoTotal, status }
    })
  },

  async definirPrioridade({ atividadeId, prioridade }) {
    const existing = await prisma.activity.findUnique({ where: { id: atividadeId } })
    if (!existing) return null
    const row = await prisma.activity.update({
      where: { id: atividadeId },
      data: { priority: prioridade },
    })
    return toAtividade(row)
  },

  async buscarOrdemProducao(atividadeId): Promise<DadosOrdemProducao | null> {
    const row = await prisma.activity.findUnique({
      where: { id: atividadeId },
      include: {
        orderItem: { include: { order: true } },
        sector: true,
        executions: { select: { quantity: true } },
      },
    })
    if (!row) return null
    return {
      atividadeId: row.id,
      pedido: row.orderItem.order.legacyNumber,
      item: row.orderItem.description ?? row.orderItem.productCode ?? '',
      setor: row.sector.name,
      unidade: row.orderItem.unit,
      solicitado: row.orderItem.requestedQuantity,
      executado: somarExecucoes(row.executions.map((execution) => execution.quantity)),
    }
  },
}
