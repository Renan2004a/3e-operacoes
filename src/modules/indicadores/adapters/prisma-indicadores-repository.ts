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
import type { ActivityStatus } from '@/modules/producao/tipos'

/** Atividade detalhada para a lista do painel (P07). */
export interface AtividadeDetalhadaIndicador {
  id: string
  orderId: string
  orderNumber: string
  itemDescription: string | null
  sectorName: string
  status: ActivityStatus
  priority: number
  deadlineAt: Date | null
}

/** Porta de leitura das atividades por status (P07). */
export interface AtividadesIndicadorRepository {
  listarAtividadesDetalhadas(filtro?: {
    status?: ActivityStatus | 'ABERTAS' | null
    limite?: number
  }): Promise<AtividadeDetalhadaIndicador[]>
}

/** Porta única de indicadores, composta pelas portas de cada caso de uso. */
export interface IndicadoresRepository
  extends ConsultaPedidosRepository,
    PainelRepository,
    PcpRepository,
    AlertasRepository,
    AtividadesIndicadorRepository {}

function situacaoClassificacao(sectorId: string | null): 'CLASSIFIED' | 'PENDING_CLASSIFICATION' {
  return sectorId ? 'CLASSIFIED' : 'PENDING_CLASSIFICATION'
}

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
              deadlineAt: true,
              sectorId: true,
              status: true,
              sector: { select: { code: true } },
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
        itens: row.items.map((item) => ({
          classificationStatus: situacaoClassificacao(item.sectorId),
          deadlineAt: item.deadlineAt,
          atividades: item.sectorId && item.sector
            ? [{ sectorCode: item.sector.code, status: item.status }]
            : [],
        })),
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
        deadlineAt: true,
        sectorId: true,
        status: true,
        operationalDeadlineAt: true,
        legacyCategory: true,
        sector: { select: { code: true, name: true } },
        _count: { select: { executions: true, occurrences: true, deliveries: true } },
        scheduledDeliveries: {
          where: { cancelledAt: null },
          select: { id: true, remessa: true, scheduledAt: true, confirmedAt: true },
          orderBy: { remessa: 'asc' },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
    return rows.map((row) => ({
      itemId: row.id,
      description: row.description,
      productCode: row.productCode,
      unit: row.unit,
      deadlineAt: row.deadlineAt,
      activityDeadlineAt: row.operationalDeadlineAt,
      classificationStatus: situacaoClassificacao(row.sectorId),
      legacyCategory: row.legacyCategory,
      sectorId: row.sectorId,
      sectorCode: row.sector?.code ?? null,
      sectorName: row.sector?.name ?? null,
      activityStatus: row.sectorId ? row.status : null,
      registrosAtividade: row.sectorId
        ? {
            status: row.status,
            execucoes: row._count.executions,
            ocorrencias: row._count.occurrences,
            entregas: row._count.deliveries,
          }
        : null,
      remessas: row.scheduledDeliveries,
    }))
  },

  async buscarItensDoPedido(orderId): Promise<ItemDoPedido[] | null> {
    return prismaExpedicaoRepository.buscarItensDoPedido(orderId)
  },

  async listarRegrasProdutoSetor() {
    const rows = await prisma.classificationRule.findMany({
      where: { active: true, matchType: { in: ['CODIGO_PRODUTO', 'DESCRICAO'] } },
      select: { operator: true, value: true, sectorId: true, priority: true },
      orderBy: { priority: 'desc' },
    })
    const vistos = new Set<string>()
    return rows
      .map((row) => ({
        matchType: row.operator === 'PREFIXO' ? 'PREFIX' : 'CONTAINS',
        matchValue: row.value,
        sectorId: row.sectorId,
        priority: row.priority,
      }))
      .filter((regra) => {
        const chave = `${regra.matchType}|${regra.matchValue}|${regra.sectorId}`
        if (vistos.has(chave)) return false
        vistos.add(chave)
        return true
      })
  },

  async listarItensParaAlerta(): Promise<ItemParaAlerta[]> {
    const rows = await prisma.orderItem.findMany({
      select: {
        id: true,
        description: true,
        sectorId: true,
        status: true,
        classifiedAt: true,
        operationalDeadlineAt: true,
        order: { select: { id: true, legacyNumber: true } },
        sector: { select: { name: true } },
        executions: {
          where: { cancelledAt: null },
          select: { occurredAt: true },
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
      },
    })
    return rows.map((row) => ({
      itemId: row.id,
      orderId: row.order.id,
      orderNumber: row.order.legacyNumber,
      itemDescription: row.description,
      classificationStatus: situacaoClassificacao(row.sectorId),
      activityId: row.sectorId ? row.id : null,
      activityStatus: row.sectorId ? row.status : null,
      sectorName: row.sector?.name ?? null,
      activityCreatedAt: row.classifiedAt,
      deadlineAt: row.operationalDeadlineAt,
      lastExecutionAt: row.executions[0]?.occurredAt ?? null,
    }))
  },

  async listarAtividades(): Promise<AtividadeIndicador[]> {
    const rows = await prisma.orderItem.findMany({
      where: { sectorId: { not: null } },
      select: { id: true, sectorId: true, status: true, sector: { select: { name: true } } },
    })
    return rows.map((row) => ({
      id: row.id,
      sectorId: row.sectorId ?? '',
      status: row.status,
      sectorName: row.sector?.name ?? '',
    }))
  },

  async listarExecucoes(): Promise<ExecucaoIndicador[]> {
    const rows = await prisma.execution.findMany({
      where: { cancelledAt: null },
      select: {
        quantity: true,
        activity: {
          select: {
            sectorId: true,
            sector: { select: { name: true } },
            unit: true,
          },
        },
      },
    })
    return rows.map((row) => ({
      sectorId: row.activity.sectorId ?? '',
      unidade: row.activity.unit,
      quantidade: row.quantity,
      sectorName: row.activity.sector?.name ?? '',
    }))
  },

  async listarAtividadesComPrazo(): Promise<AtividadeComPrazo[]> {
    const rows = await prisma.orderItem.findMany({
      where: { operationalDeadlineAt: { not: null }, sectorId: { not: null } },
      select: {
        id: true,
        sectorId: true,
        status: true,
        operationalDeadlineAt: true,
        executions: {
          where: { cancelledAt: null },
          select: { occurredAt: true },
          orderBy: { occurredAt: 'desc' },
          take: 1,
        },
      },
    })

    return rows.map((row) => ({
      id: row.id,
      sectorId: row.sectorId ?? '',
      status: row.status,
      deadlineAt: row.operationalDeadlineAt,
      completedAt: row.executions[0]?.occurredAt ?? null,
    }))
  },

  async listarAtividadesDetalhadas({ status, limite = 200 } = {}): Promise<
    AtividadeDetalhadaIndicador[]
  > {
    const where = {
      sectorId: { not: null },
      ...(status === 'ABERTAS'
        ? { status: { not: 'COMPLETED' as const } }
        : status
          ? { status }
          : {}),
    }

    const rows = await prisma.orderItem.findMany({
      where,
      select: {
        id: true,
        status: true,
        priority: true,
        operationalDeadlineAt: true,
        description: true,
        productCode: true,
        order: { select: { id: true, legacyNumber: true } },
        sector: { select: { name: true } },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: limite,
    })

    return rows.map((row) => ({
      id: row.id,
      orderId: row.order.id,
      orderNumber: row.order.legacyNumber,
      itemDescription: row.description ?? row.productCode,
      sectorName: row.sector?.name ?? '',
      status: row.status,
      priority: row.priority,
      deadlineAt: row.operationalDeadlineAt,
    }))
  },
}
