import { prismaIndicadoresRepository } from '../../../modules/indicadores/adapters/prisma-indicadores-repository'
import {
  listarPedidos,
  type FiltrosPedido,
  type StatusPedido,
} from '../../../modules/indicadores/consulta-pedidos'
import { autorizar } from '../../../shared/http/autorizacao'

const STATUS_VALIDOS: readonly StatusPedido[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED']

/** Data do parâmetro: `undefined` quando ausente, `null` quando inválida. */
function lerData(valor: string | null): Date | null | undefined {
  if (valor === null || valor.trim() === '') return undefined
  const data = new Date(valor)
  return Number.isNaN(data.getTime()) ? null : data
}

/** Inteiro não negativo do parâmetro: `undefined` quando ausente, `null` quando inválido. */
function lerInteiro(valor: string | null): number | null | undefined {
  if (valor === null || valor.trim() === '') return undefined
  const numero = Number(valor)
  return Number.isInteger(numero) && numero >= 0 ? numero : null
}

/**
 * GET /api/pedidos — lista os pedidos com filtros de cliente, setor, status e
 * período (RF008, IND-01..03). Somente leitura e restrita à sessão (IND-11).
 */
export async function GET(request: Request) {
  const auth = await autorizar(request, 'consultar_pedidos')
  if (!auth.autorizado) return auth.resposta

  const params = new URL(request.url).searchParams
  const status = params.get('status')
  const de = lerData(params.get('de'))
  const ate = lerData(params.get('ate'))
  const limite = lerInteiro(params.get('limite'))
  const offset = lerInteiro(params.get('offset'))

  if (
    (status !== null && status !== '' && !STATUS_VALIDOS.includes(status as StatusPedido)) ||
    de === null ||
    ate === null ||
    limite === null ||
    offset === null
  ) {
    return Response.json({ error: 'invalid_filters' }, { status: 400 })
  }

  const filtros: FiltrosPedido = {
    cliente: params.get('cliente') ?? undefined,
    setor: params.get('setor') ?? undefined,
    status: status ? (status as StatusPedido) : undefined,
    de,
    ate,
    limite,
    offset,
  }

  const pedidos = await listarPedidos(filtros, prismaIndicadoresRepository)
  return Response.json({ pedidos }, { status: 200 })
}
