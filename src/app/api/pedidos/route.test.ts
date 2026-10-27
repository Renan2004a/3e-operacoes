import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../modules/auth/sessao'
import type {
  ConsultaPedidosCriterios,
  PedidoConsultado,
  ResultadoConsultaPedidos,
} from '../../../modules/indicadores/consulta-pedidos'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const chamadas: ConsultaPedidosCriterios[] = []
  let resultado: ResultadoConsultaPedidos = { pedidos: [], total: 0 }
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    async consultarPedidos(criterios: ConsultaPedidosCriterios) {
      chamadas.push(criterios)
      return resultado
    },
  }

  const usuariosRepo = {
    findById: async (id: string) => ({ id, roles: [...(perfis[id] ?? [])] }),
  }

  function reset() {
    chamadas.length = 0
    resultado = { pedidos: [], total: 0 }
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return {
    chamadas,
    perfis,
    repo,
    usuariosRepo,
    reset,
    definirResultado(valor: ResultadoConsultaPedidos) {
      resultado = valor
    },
  }
})

vi.mock('../../../modules/indicadores/adapters/prisma-indicadores-repository', () => ({
  prismaIndicadoresRepository: mocks.repo,
}))

vi.mock('@/modules/usuarios/adapters/prisma-usuarios-repository', () => ({
  prismaUsuariosRepository: mocks.usuariosRepo,
}))

import { GET } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function pedido(
  id: string,
  numero: string,
  cliente: string | null,
  status: PedidoConsultado['itens'][number]['atividades'][number]['status'],
): PedidoConsultado {
  return {
    id,
    numero,
    cliente,
    criadoEm: new Date('2026-10-07T12:00:00.000Z'),
    itens: [
      {
        classificationStatus: 'CLASSIFIED',
        atividades: [{ sectorCode: 'TELHAS', status }],
      },
    ],
  }
}

function request(
  opts: { userId?: string | null; xUserId?: string | null; query?: string } = {},
): Request {
  const { userId = 'user_vendedor', xUserId = null, query = '' } = opts
  const headers: Record<string, string> = {}
  if (userId) {
    const token = assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
    headers.cookie = `${SESSION_COOKIE}=${token}`
  }
  if (xUserId) headers['x-user-id'] = xUserId
  return new Request(`http://localhost/api/pedidos${query}`, { method: 'GET', headers })
}

async function consultar(query = '', userId = 'user_vendedor') {
  const response = await GET(request({ userId, query }))
  return { status: response.status, body: await response.json() }
}

describe('GET /api/pedidos', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_vendedor = ['SELLER']
    mocks.perfis.user_gerente = ['PRODUCTION_MANAGER']
    mocks.perfis.user_sem_perfil = []
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 com número, cliente, status e paginação (IND-01, A1)', async () => {
    mocks.definirResultado({
      pedidos: [pedido('ped_1', '1001', 'Construtora X', 'COMPLETED')],
      total: 137,
    })

    const resposta = await consultar()

    expect(resposta.status).toBe(200)
    expect(resposta.body.pedidos).toEqual([
      { id: 'ped_1', numero: '1001', cliente: 'Construtora X', status: 'COMPLETED', previsao: null },
    ])
    expect(resposta.body.paginacao).toEqual({
      limite: 20,
      offset: 0,
      pagina: 1,
      total: 137,
      totalPaginas: 7,
    })
  })

  it('aplica o limite padrão de 20 e o offset padrão 0 (QF-07, A1)', async () => {
    await consultar()

    expect(mocks.chamadas[0]).toMatchObject({ limite: 20, offset: 0 })
  })

  it('repassa limite e offset e devolve os metadados da página (A1)', async () => {
    mocks.definirResultado({
      pedidos: [pedido('ped_2', '1002', 'Mercado Y', 'PENDING')],
      total: 45,
    })

    const resposta = await consultar('?limite=10&offset=20')

    expect(resposta.status).toBe(200)
    expect(mocks.chamadas[0]).toMatchObject({ limite: 10, offset: 20 })
    expect(resposta.body.paginacao).toEqual({
      limite: 10,
      offset: 20,
      pagina: 3,
      total: 45,
      totalPaginas: 5,
    })
  })

  it('responde 200 com lista vazia e total correto para página inexistente (A1, D2)', async () => {
    mocks.definirResultado({ pedidos: [], total: 25 })

    const resposta = await consultar('?offset=60')

    expect(resposta.status).toBe(200)
    expect(resposta.body.pedidos).toEqual([])
    expect(resposta.body.paginacao).toMatchObject({ pagina: 4, total: 25, totalPaginas: 2 })
  })

  it('repassa número, cliente, setor, status e período em conjunto (IND-02)', async () => {
    await consultar(
      '?numero=7043&cliente=Construtora&setor=TELHAS&status=IN_PROGRESS&de=2026-10-22&ate=2026-10-22',
    )

    expect(mocks.chamadas[0]).toMatchObject({
      numero: '7043',
      cliente: 'Construtora',
      setor: 'TELHAS',
      status: 'IN_PROGRESS',
      de: new Date('2026-10-22T03:00:00.000Z'),
      ate: new Date('2026-10-23T03:00:00.000Z'),
    })
  })

  it('trata de e ate como dias civis em America/Sao_Paulo (AD-014)', async () => {
    await consultar('?de=2026-10-22&ate=2026-10-22')

    expect(mocks.chamadas[0].de).toEqual(new Date('2026-10-22T03:00:00.000Z'))
    expect(mocks.chamadas[0].ate).toEqual(new Date('2026-10-23T03:00:00.000Z'))
  })

  it('não restringe a consulta quando número ou cliente vêm vazios (AD-019)', async () => {
    await consultar('?numero=%20%20&cliente=')

    expect(mocks.chamadas[0]).toMatchObject({ numero: undefined, cliente: undefined })
  })

  it('responde 400 com filtro inválido e não consulta (IND-02)', async () => {
    for (const query of [
      '?status=INVALIDO',
      '?limite=-1',
      '?offset=-1',
      '?de=2026-02-30',
      '?setor=Telhas',
      '?setor=INEXISTENTE',
    ]) {
      const resposta = await consultar(query)
      expect(resposta.status).toBe(400)
      expect(resposta.body.error).toBe('invalid_filters')
    }
    expect(mocks.chamadas).toHaveLength(0)
  })

  it('responde 401 sem sessão (IND-11)', async () => {
    const response = await GET(request({ userId: null }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('ignora o cabeçalho x-user-id quando não há sessão (IND-11)', async () => {
    const response = await GET(request({ userId: null, xUserId: 'user_vendedor' }))

    expect(response.status).toBe(401)
  })

  it('responde 403 quando o usuário não tem perfil (IND-11)', async () => {
    const response = await GET(request({ userId: 'user_sem_perfil' }))

    expect(response.status).toBe(403)
    expect((await response.json()).error).toBe('forbidden')
  })

  it('aplica a consulta para o Vendedor e para o Gerente (IND-11)', async () => {
    mocks.definirResultado({ pedidos: [pedido('ped_1', '1001', 'Cliente', 'PENDING')], total: 1 })

    const vendedor = await consultar('?setor=TELHAS', 'user_vendedor')
    const gerente = await consultar('?setor=TELHAS', 'user_gerente')

    expect(vendedor.status).toBe(200)
    expect(gerente.status).toBe(200)
    expect(vendedor.body.pedidos).toEqual(gerente.body.pedidos)
  })

  it('mantém a recusa de acesso sem perfil quando há filtros (IND-11)', async () => {
    const resposta = await consultar('?numero=70435&setor=TELHAS', 'user_sem_perfil')

    expect(resposta.status).toBe(403)
    expect(mocks.chamadas).toHaveLength(0)
  })
})
