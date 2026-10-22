import { prisma } from '@/shared/db/prisma'
import { prismaExpedicaoRepository } from '@/modules/expedicao/adapters/prisma-expedicao-repository'
import type { ItemDoPedido } from '@/modules/expedicao/saldo-pedido'
import type {
  CabecalhoPedido,
  ConsultaPedidosRepository,
  EspecificacaoItem,
  ResultadoConsultaPedidos,
} from '../consulta-pedidos'
import { montarWherePedidos } from './filtros-pedidos-prisma'
import type { AtividadeIndicador, PainelRepository } from '../painel'
import type { AtividadeComPrazo, ExecucaoIndicador, PcpRepository } from '../pcp'
import type { AlertasRepository, ItemParaAlerta } from '../alertas'

/** Porta única de indicadores, composta pelas portas de cada caso de uso. */
export interface IndicadoresRepository
  extends ConsultaPedidosRepository, PainelRepository, PcpRepository, AlertasRepository {}

/** Implementação Prisma da porta `IndicadoresRepository` (somente o banco do app). */
export const prismaIndicadoresRepository: IndicadoresRepository = {
  async consultarPedidos({ limite, offset, ...filtros }): Promise<ResultadoConsultaPedidos> {
    const where = montarWherePedidos(filtros)

    // Página e total no mesmo snapshot: uma importação concorrente não faz o
    // total divergir da lista devolvida (A1).
    const [rows, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        select: {
          id: true,
          legacyNumber: true,
          customerName: true,
          createdAt: true,
          items: {
            select: {
              activities: { select: { status: true, sector: { select: { code: true } } } },
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: offset,
        take: limite,
      }),
      prisma.order.count({ where }),
    ])

    return {
      pedidos: rows.map((row) => ({
        id: row.id,
        numero: row.legacyNumber,
        cliente: row.customerName,
        criadoEm: row.createdAt,
        atividades: row.items.flatMap((item) =>
          item.activities.map((atividade) => ({
            sectorCode: atividade.sector.code,
            status: atividade.status,
          })),
        ),
      })),
      total,
    }
  },

  async buscarCabecalhoPedido(orderId): Promise<CabecalhoPedido | null> {
    const row = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, legacyNumber: true, customerName: true, sellerLegacyCode: true },
    })
    if (!row) return null
    return {
      id: row.id,
      numero: row.legacyNumber,
      cliente: row.customerName,
      customerName: row.customerName,
      sellerLegacyCode: row.sellerLegacyCode,
    }
  },

  async buscarEspecificacoesDosItens(orderId): Promise<EspecificacaoItem[]> {
    const rows = await prisma.orderItem.findMany({
      where: { orderId },
      select: {
        id: true,
        description: true,
        productCode: true,
        unit: true,
        classificationStatus: true,
        activities: {
          select: {
            sectorId: true,
            status: true,
            sector: { select: { code: true, name: true } },
            _count: { select: { executions: true, occurrences: true } },
          },
          take: 1,
        },
        scheduledDeliveries: {
          select: { id: true, remessa: true, scheduledAt: true, confirmedAt: true },
          orderBy: { remessa: 'asc' },
        },
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => {
      const atividade = row.activities[0]
      return {
        itemId: row.id,
        description: row.description,
        productCode: row.productCode,
        unit: row.unit,
        classificationStatus: row.classificationStatus,
        sectorId: atividade?.sectorId ?? null,
        sectorCode: atividade?.sector.code ?? null,
        sectorName: atividade?.sector.name ?? null,
        activityStatus: atividade?.status ?? null,
        registrosAtividade: atividade
          ? {
              status: atividade.status,
              execucoes: atividade._count.executions,
              ocorrencias: atividade._count.occurrences,
              entregas: row._count.deliveries,
            }
          : null,
        remessas: row.scheduledDeliveries,
      }
    })
  },

  async buscarItensDoPedido(orderId): Promise<ItemDoPedido[] | null> {
    return prismaExpedicaoRepository.buscarItensDoPedido(orderId)
  },

  async listarRegrasProdutoSetor() {
    return prisma.productSectorRule.findMany({
      where: { active: true },
      select: { matchType: true, matchValue: true, sectorId: true, priority: true },
      orderBy: { priority: 'desc' },
    })
  },

  async listarItensParaAlerta(): Promise<ItemParaAlerta[]> {
    const rows = await prisma.orderItem.findMany({
      select: {
        id: true,
        description: true,
        classificationStatus: true,
        order: { select: { id: true, legacyNumber: true } },
        activities: {
          select: {
            id: true,
            status: true,
            deadlineAt: true,
            createdAt: true,
            sector: { select: { name: true } },
            executions: {
              select: { occurredAt: true },
              orderBy: { occurredAt: 'desc' },
              take: 1,
            },
          },
          take: 1,
        },
      },
    })
    return rows.map((row) => {
      const atividade = row.activities[0]
      return {
        itemId: row.id,
        orderId: row.order.id,
        orderNumber: row.order.legacyNumber,
        itemDescription: row.description,
        classificationStatus: row.classificationStatus,
        activityId: atividade?.id ?? null,
        activityStatus: atividade?.status ?? null,
        sectorName: atividade?.sector.name ?? null,
        activityCreatedAt: atividade?.createdAt ?? null,
        deadlineAt: atividade?.deadlineAt ?? null,
        lastExecutionAt: atividade?.executions[0]?.occurredAt ?? null,
      }
    })
  },

  async listarAtividades(): Promise<AtividadeIndicador[]> {
    const rows = await prisma.activity.findMany({
      select: { id: true, sectorId: true, status: true, sector: { select: { name: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      sectorId: row.sectorId,
      status: row.status,
      sectorName: row.sector.name,
    }))
  },

  async listarExecucoes(): Promise<ExecucaoIndicador[]> {
    const rows = await prisma.execution.findMany({
      select: {
        quantity: true,
        activity: {
          select: {
            sectorId: true,
            sector: { select: { name: true } },
            orderItem: { select: { unit: true } },
          },
        },
      },
    })
    return rows.map((row) => ({
      sectorId: row.activity.sectorId,
      unidade: row.activity.orderItem.unit,
      quantidade: row.quantity,
      sectorName: row.activity.sector.name,
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
