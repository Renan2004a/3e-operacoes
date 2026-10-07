import { prisma } from '@/shared/db/prisma'
import { prismaExpedicaoRepository } from '@/modules/expedicao/adapters/prisma-expedicao-repository'
import type { ItemDoPedido } from '@/modules/expedicao/saldo-pedido'
import type {
  CabecalhoPedido,
  ConsultaPedidosRepository,
  PedidoConsultado,
} from '../consulta-pedidos'
import type { AtividadeIndicador, PainelRepository } from '../painel'
import type { AtividadeComPrazo, ExecucaoIndicador, PcpRepository } from '../pcp'

/** Porta única de indicadores, composta pelas portas de cada caso de uso. */
export interface IndicadoresRepository
  extends ConsultaPedidosRepository,
    PainelRepository,
    PcpRepository {}

/** Implementação Prisma da porta `IndicadoresRepository` (somente o banco do app). */
export const prismaIndicadoresRepository: IndicadoresRepository = {
  async listarPedidosParaConsulta(): Promise<PedidoConsultado[]> {
    const rows = await prisma.order.findMany({
      select: {
        id: true,
        legacyNumber: true,
        customerName: true,
        createdAt: true,
        items: {
          select: { activities: { select: { sectorId: true, status: true } } },
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      numero: row.legacyNumber,
      cliente: row.customerName,
      criadoEm: row.createdAt,
      atividades: row.items.flatMap((item) =>
        item.activities.map((atividade) => ({
          sectorId: atividade.sectorId,
          status: atividade.status,
        })),
      ),
    }))
  },

  async buscarCabecalhoPedido(orderId): Promise<CabecalhoPedido | null> {
    const row = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, legacyNumber: true, customerName: true },
    })
    if (!row) return null
    return { id: row.id, numero: row.legacyNumber, cliente: row.customerName }
  },

  async buscarItensDoPedido(orderId): Promise<ItemDoPedido[] | null> {
    return prismaExpedicaoRepository.buscarItensDoPedido(orderId)
  },

  async listarAtividades(): Promise<AtividadeIndicador[]> {
    const rows = await prisma.activity.findMany({
      select: { id: true, sectorId: true, status: true },
    })
    return rows.map((row) => ({ id: row.id, sectorId: row.sectorId, status: row.status }))
  },

  async listarExecucoes(): Promise<ExecucaoIndicador[]> {
    const rows = await prisma.execution.findMany({
      select: { quantity: true, activity: { select: { sectorId: true } } },
    })
    return rows.map((row) => ({
      sectorId: row.activity.sectorId,
      quantidade: row.quantity,
    }))
  },

  async listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]> {
    const rows = await prisma.activity.findMany({
      select: {
        id: true,
        sectorId: true,
        status: true,
        deadlineAt: true,
        executions: {
          select: { occurredAt: true },
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      sectorId: row.sectorId,
      status: row.status,
      deadlineAt: row.deadlineAt,
      completedAt: row.executions[0]?.occurredAt ?? null,
    }))
  },
}
