import { prismaIndicadoresRepository } from '../../../../modules/indicadores/adapters/prisma-indicadores-repository'
import { autorizar } from '../../../../shared/http/autorizacao'
import type { ActivityStatus } from '@/modules/producao/tipos'

const STATUS_VALIDOS = new Set<ActivityStatus | 'ABERTAS'>([
  'ABERTAS',
  'PENDING',
  'IN_PROGRESS',
  'PAUSED',
  'COMPLETED',
  'DIVERGENT',
])

/**
 * GET /api/indicadores/atividades — lista as atividades por status para o
 * drill-down dos cartões do painel (P07). Sem filtro, devolve todas.
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const bruto = new URL(request.url).searchParams.get('status')
  if (bruto !== null && !STATUS_VALIDOS.has(bruto as ActivityStatus | 'ABERTAS')) {
    return Response.json({ error: 'invalid_status' }, { status: 400 })
  }

  const status = (bruto as ActivityStatus | 'ABERTAS' | null) || null
  const atividades = await prismaIndicadoresRepository.listarAtividadesDetalhadas({ status })
  return Response.json({ atividades }, { status: 200 })
}
