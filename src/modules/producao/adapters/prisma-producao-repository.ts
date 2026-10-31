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

interface ItemOperacionalRow {
  id: string
  sectorId: string | null
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

function toAtividade(row: ItemOperacionalRow): Atividade {
  return {
    id: row.id,
    // O item é a unidade operacional; o contrato de "atividade" é preservado.
    orderItemId: row.id,
    sectorId: row.sectorId ?? '',
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

  async listarTodosOsSetores() {
    const rows = await prisma.sector.findMany({
      where: { active: true },
      select: { id: true },
    })
    return rows.map((row) => row.id)
  },

  async listarAtividadesPorSetores(sectorIds) {
    if (sectorIds.length === 0) return []
    const rows = await prisma.orderItem.findMany({
      // A fila é de itens em aberto: concluídos ficam no histórico/painel.
      where: { sectorId: { in: sectorIds }, status: { not: 'COMPLETED' } },
      orderBy: { createdAt: 'asc' },
      include: {
        sector: { select: { name: true } },
        order: { select: { legacyNumber: true } },
      },
    })
    return rows.map((row) => ({
      ...toAtividade(row),
      itemDescription: row.description,
      productCode: row.productCode,
      orderNumber: row.order.legacyNumber,
      sectorName: row.sector?.name ?? '',
    }))
  },

  async buscarAtividadeParaExecucao(atividadeId): Promise<AtividadeParaExecucao | null> {
    const row = await prisma.orderItem.findUnique({ where: { id: atividadeId } })
    if (!row || !row.sectorId) return null
    return {
      id: row.id,
      sectorId: row.sectorId,
      unidade: row.unit,
      solicitado: row.requestedQuantity,
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
      // Serializa execuções do mesmo item: duas submissões simultâneas não
      // podem calcular o status só com as próprias linhas.
      await tx.$queryRaw`SELECT id FROM pedidos_itens WHERE id = ${input.atividadeId} FOR UPDATE`

      const execucaoRow = await tx.execution.create({
        data: {
          activityId: input.atividadeId,
          userId: input.usuarioId,
          quantity: input.quantidade,
          occurredAt: input.occurredAt,
          finishedAt: input.occurredAt,
        },
      })
      const agregado = await tx.execution.aggregate({
        where: { activityId: input.atividadeId, cancelledAt: null },
        _sum: { quantity: true },
      })
      const executadoTotal = agregado._sum.quantity ?? new Prisma.Decimal(0)
      const status = input.resolverStatus(executadoTotal)
      await tx.orderItem.update({ where: { id: input.atividadeId }, data: { status } })
      return { execucao: toExecucao(execucaoRow), executadoTotal, status }
    })
  },

  async definirPrioridade({ atividadeId, prioridade }) {
    const existing = await prisma.orderItem.findUnique({ where: { id: atividadeId } })
    if (!existing) return null
    const row = await prisma.orderItem.update({
      where: { id: atividadeId },
      data: { priority: prioridade },
    })
    return toAtividade(row)
  },

  async buscarOrdemProducao(atividadeId): Promise<DadosOrdemProducao | null> {
    const row = await prisma.orderItem.findUnique({
      where: { id: atividadeId },
      include: {
        order: true,
        sector: true,
        executions: { where: { cancelledAt: null }, select: { quantity: true } },
      },
    })
    if (!row || !row.sectorId) return null
    return {
      atividadeId: row.id,
      pedido: row.order.legacyNumber,
      item: row.description ?? row.productCode ?? '',
      setor: row.sector?.name ?? '',
      unidade: row.unit,
      solicitado: row.requestedQuantity,
      executado: somarExecucoes(row.executions.map((execution) => execution.quantity)),
      previsao: row.deadlineAt,
    }
  },
}
