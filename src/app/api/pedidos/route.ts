import { prismaIndicadoresRepository } from '../../../modules/indicadores/adapters/prisma-indicadores-repository'
import {
  listarPedidos,
  type FiltrosPedido,
  type StatusPedido,
} from '../../../modules/indicadores/consulta-pedidos'
import { ehCodigoSetor, type CodigoSetor } from '../../../modules/setores/codigos-setor'
import { autorizar } from '../../../shared/http/autorizacao'
import { inicioDoDiaNoFuso } from '../../../shared/time/dia-do-periodo'

const STATUS_VALIDOS: readonly StatusPedido[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED']

/**
 * Dia do filtro (`YYYY-MM-DD`, no fuso de São Paulo): `undefined` quando ausente,
 * `null` quando inválido. `diasAdicionais: 1` devolve o início do dia seguinte.
 */
function lerDia(valor: string | null, diasAdicionais: 0 | 1): Date | null | undefined {
  if (valor === null || valor.trim() === '') return undefined
  return inicioDoDiaNoFuso(valor, diasAdicionais)
}

/** Código do setor: `undefined` quando ausente, `null` quando não é um código válido. */
function lerSetor(valor: string | null): CodigoSetor | null | undefined {
  if (valor === null || valor.trim() === '') return undefined
  return ehCodigoSetor(valor) ? valor : null
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
  const setor = lerSetor(params.get('setor'))
  const de = lerDia(params.get('de'), 0)
  const ate = lerDia(params.get('ate'), 1)
  const limite = lerInteiro(params.get('limite'))
  const offset = lerInteiro(params.get('offset'))

  if (
    (status !== null && status !== '' && !STATUS_VALIDOS.includes(status as StatusPedido)) ||
    setor === null ||
    de === null ||
    ate === null ||
    limite === null ||
    offset === null
  ) {
    return Response.json({ error: 'invalid_filters' }, { status: 400 })
  }

  const filtros: FiltrosPedido = {
    cliente: params.get('cliente') ?? undefined,
    setor,
    status: status ? (status as StatusPedido) : undefined,
    de,
    ate,
    limite,
    offset,
  }

  const pedidos = await listarPedidos(filtros, prismaIndicadoresRepository)
  return Response.json({ pedidos }, { status: 200 })
}
