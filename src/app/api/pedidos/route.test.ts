import type { RoleCode } from '@/generated/prisma/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assinarSessao } from '../../../modules/auth/sessao'
import type { PedidoConsultado } from '../../../modules/indicadores/consulta-pedidos'
import { SESSION_COOKIE } from '../../../shared/http/auth-context'

const mocks = vi.hoisted(() => {
  const pedidos: PedidoConsultado[] = []
  const perfis: Record<string, RoleCode[]> = {}

  const repo = {
    listarPedidosParaConsulta: async () =>
      pedidos.map((pedido) => ({
        ...pedido,
        atividades: pedido.atividades.map((atividade) => ({ ...atividade })),
      })),
  }

  const usuariosRepo = {
    findById: async (id: string) => ({ id, roles: [...(perfis[id] ?? [])] }),
  }

  function reset() {
    pedidos.length = 0
    for (const key of Object.keys(perfis)) delete perfis[key]
  }

  return { pedidos, perfis, repo, usuariosRepo, reset }
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
  status: PedidoConsultado['atividades'][number]['status'],
): PedidoConsultado {
  return {
    id,
    numero,
    cliente,
    criadoEm: new Date('2026-10-07T12:00:00.000Z'),
    atividades: [{ sectorCode: 'TELHAS', status }],
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

describe('GET /api/pedidos', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.reset()
    mocks.perfis.user_vendedor = ['SELLER']
    mocks.perfis.user_sem_perfil = []
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 com número, cliente e status (IND-01)', async () => {
    mocks.pedidos.push(pedido('ped_1', '1001', 'Construtora X', 'COMPLETED'))

    const response = await GET(request())

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pedidos).toHaveLength(1)
    expect(body.pedidos[0]).toEqual({
      id: 'ped_1',
      numero: '1001',
      cliente: 'Construtora X',
      status: 'COMPLETED',
    })
  })

  it('aplica os filtros de cliente e status para o vendedor (IND-02, IND-03)', async () => {
    mocks.pedidos.push(
      pedido('ped_1', '1001', 'Construtora X', 'COMPLETED'),
      pedido('ped_2', '1002', 'Mercado Y', 'PENDING'),
    )

    const response = await GET(request({ query: '?cliente=construtora&status=COMPLETED' }))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.pedidos.map((linha: { id: string }) => linha.id)).toEqual(['ped_1'])
  })

  it('responde 400 com filtro inválido e não consulta (IND-02)', async () => {
    mocks.pedidos.push(pedido('ped_1', '1001', 'Construtora X', 'COMPLETED'))

    const status = await GET(request({ query: '?status=INVALIDO' }))
    expect(status.status).toBe(400)
    expect((await status.json()).error).toBe('invalid_filters')

    const limite = await GET(request({ query: '?limite=-1' }))
    expect(limite.status).toBe(400)
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

  describe('filtro de setor pelo código do setor', () => {
    function pedidoComAtividades(
      id: string,
      numero: string,
      atividades: PedidoConsultado['atividades'],
      criadoEm = '2026-10-22T12:00:00.000-03:00',
    ): PedidoConsultado {
      return {
        ...pedido(id, numero, 'Cliente', 'PENDING'),
        atividades,
        criadoEm: new Date(criadoEm),
      }
    }

    async function numerosDoFiltro(query: string, userId = 'user_vendedor') {
      const response = await GET(request({ userId, query: `?${query}` }))
      return { status: response.status, body: await response.json() }
    }

    it('retorna pedido com itens de um único setor e exclui os demais (IND-02)', async () => {
      mocks.pedidos.push(
        pedidoComAtividades('ped_1', '1001', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
        pedidoComAtividades('ped_2', '1002', [{ sectorCode: 'CORTE_DOBRA', status: 'PENDING' }]),
      )

      const resposta = await numerosDoFiltro('setor=TELHAS')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos.map((linha: { numero: string }) => linha.numero)).toEqual([
        '1001',
      ])
    })

    it('retorna pedido com itens de vários setores em cada um dos setores (IND-02)', async () => {
      mocks.pedidos.push(
        pedidoComAtividades('ped_1', '1001', [
          { sectorCode: 'TELHAS', status: 'PENDING' },
          { sectorCode: 'CORTE_DOBRA', status: 'COMPLETED' },
        ]),
      )

      expect((await numerosDoFiltro('setor=TELHAS')).body.pedidos).toHaveLength(1)
      expect((await numerosDoFiltro('setor=CORTE_DOBRA')).body.pedidos).toHaveLength(1)
      expect((await numerosDoFiltro('setor=REVENDA')).body.pedidos).toEqual([])
    })

    it('não retorna pedido sem itens classificados quando há filtro de setor (LAC-04)', async () => {
      mocks.pedidos.push(pedidoComAtividades('ped_1', '1001', []))

      expect((await numerosDoFiltro('setor=TELHAS')).body.pedidos).toEqual([])
      expect((await numerosDoFiltro('')).body.pedidos).toHaveLength(1)
    })

    it('sem setor, não filtra por setor', async () => {
      mocks.pedidos.push(
        pedidoComAtividades('ped_1', '1001', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
        pedidoComAtividades('ped_2', '1002', []),
      )

      const resposta = await numerosDoFiltro('')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos).toHaveLength(2)
    })

    it('aplica o filtro de setor para o Vendedor e para o Gerente (IND-11)', async () => {
      mocks.perfis.user_gerente = ['PRODUCTION_MANAGER']
      mocks.pedidos.push(
        pedidoComAtividades('ped_1', '1001', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
        pedidoComAtividades('ped_2', '1002', [{ sectorCode: 'REVENDA', status: 'PENDING' }]),
      )

      const vendedor = await numerosDoFiltro('setor=TELHAS', 'user_vendedor')
      const gerente = await numerosDoFiltro('setor=TELHAS', 'user_gerente')

      expect(vendedor.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['1001'])
      expect(gerente.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['1001'])
    })

    it('mantém a recusa de acesso sem perfil quando há filtro de setor (IND-11)', async () => {
      const response = await GET(request({ userId: 'user_sem_perfil', query: '?setor=TELHAS' }))

      expect(response.status).toBe(403)
    })

    it('responde 400 para setor que não é um código válido e não consulta (LAC-04)', async () => {
      mocks.pedidos.push(
        pedidoComAtividades('ped_1', '1001', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
      )

      for (const valor of ['Telhas', 'telhas', 'setor_telhas', 'INEXISTENTE', 'Corte e Dobra']) {
        const resposta = await numerosDoFiltro(`setor=${encodeURIComponent(valor)}`)
        expect(resposta.status).toBe(400)
        expect(resposta.body.error).toBe('invalid_filters')
      }
    })

    it('combina setor com status e período (AD-014)', async () => {
      mocks.pedidos.push(
        pedidoComAtividades('ped_1', '1001', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
        pedidoComAtividades('ped_2', '1002', [{ sectorCode: 'TELHAS', status: 'COMPLETED' }]),
        pedidoComAtividades(
          'ped_3',
          '1003',
          [{ sectorCode: 'TELHAS', status: 'PENDING' }],
          '2026-10-23T12:00:00.000-03:00',
        ),
        pedidoComAtividades('ped_4', '1004', [{ sectorCode: 'REVENDA', status: 'PENDING' }]),
      )

      const resposta = await numerosDoFiltro(
        'setor=TELHAS&status=PENDING&de=2026-10-22&ate=2026-10-22',
      )

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['1001'])
    })
  })

  describe('filtro de período por dia em America/Sao_Paulo (AD-014)', () => {
    function pedidoCriadoEm(id: string, numero: string, criadoEm: string): PedidoConsultado {
      return { ...pedido(id, numero, 'Cliente', 'PENDING'), criadoEm: new Date(criadoEm) }
    }

    async function numerosDoPeriodo(query: string, userId = 'user_vendedor') {
      const response = await GET(request({ userId, query: `?${query}` }))
      expect(response.status).toBe(200)
      const body = await response.json()
      return body.pedidos.map((linha: { numero: string }) => linha.numero)
    }

    it('inclui pedido criado às 23h30 de São Paulo no filtro do próprio dia', async () => {
      mocks.pedidos.push(pedidoCriadoEm('ped_1', '2001', '2026-10-23T02:30:00.000Z'))

      expect(await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22')).toEqual(['2001'])
    })

    it('com início e fim iguais, retorna o dia inteiro', async () => {
      mocks.pedidos.push(
        pedidoCriadoEm('ped_antes', '2001', '2026-10-22T02:59:59.999Z'),
        pedidoCriadoEm('ped_inicio', '2002', '2026-10-22T03:00:00.000Z'),
        pedidoCriadoEm('ped_fim', '2003', '2026-10-23T02:59:59.999Z'),
        pedidoCriadoEm('ped_depois', '2004', '2026-10-23T03:00:00.000Z'),
      )

      expect((await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22')).sort()).toEqual([
        '2002',
        '2003',
      ])
    })

    it('exclui pedidos anteriores ao início e posteriores ao fim do período', async () => {
      mocks.pedidos.push(
        pedidoCriadoEm('ped_antes', '2001', '2026-10-21T23:59:59.999-03:00'),
        pedidoCriadoEm('ped_dentro', '2002', '2026-10-22T10:00:00.000-03:00'),
        pedidoCriadoEm('ped_depois', '2003', '2026-10-23T00:00:00.000-03:00'),
      )

      expect(await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22')).toEqual(['2002'])
    })

    it('filtra um intervalo de dias incluindo o último dia inteiro', async () => {
      mocks.pedidos.push(
        pedidoCriadoEm('ped_1', '2001', '2026-10-21T12:00:00.000-03:00'),
        pedidoCriadoEm('ped_2', '2002', '2026-10-31T21:00:00.000-03:00'),
        pedidoCriadoEm('ped_3', '2003', '2026-11-01T00:30:00.000-03:00'),
      )

      expect((await numerosDoPeriodo('de=2026-10-22&ate=2026-10-31')).sort()).toEqual(['2002'])
    })

    it('mantém o filtro para o Gerente', async () => {
      mocks.perfis.user_gerente = ['PRODUCTION_MANAGER']
      mocks.pedidos.push(pedidoCriadoEm('ped_1', '2001', '2026-10-23T02:30:00.000Z'))

      expect(await numerosDoPeriodo('de=2026-10-22&ate=2026-10-22', 'user_gerente')).toEqual([
        '2001',
      ])
    })

    it('responde 400 para data que não existe no calendário', async () => {
      const response = await GET(request({ query: '?de=2026-02-30' }))

      expect(response.status).toBe(400)
      expect((await response.json()).error).toBe('invalid_filters')
    })
  })

  describe('pesquisa pelo número comercial do pedido', () => {
    function pedidoComNumero(
      id: string,
      numero: string,
      atividades: PedidoConsultado['atividades'] = [{ sectorCode: 'TELHAS', status: 'PENDING' }],
      criadoEm = '2026-10-22T12:00:00.000-03:00',
    ): PedidoConsultado {
      return {
        ...pedido(id, numero, 'Cliente', 'PENDING'),
        atividades,
        criadoEm: new Date(criadoEm),
      }
    }

    async function consultar(query: string, userId = 'user_vendedor') {
      const response = await GET(request({ userId, query: `?${query}` }))
      return { status: response.status, body: await response.json() }
    }

    it('retorna o pedido cujo número contém o trecho pesquisado (IND-02)', async () => {
      mocks.pedidos.push(
        pedidoComNumero('ped_1', '70435'),
        pedidoComNumero('ped_2', '70436'),
        pedidoComNumero('ped_3', '90001'),
      )

      const resposta = await consultar('numero=0435')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['70435'])
    })

    it('retorna lista vazia quando o número pesquisado não existe (IND-02)', async () => {
      mocks.pedidos.push(pedidoComNumero('ped_1', '70435'))

      const resposta = await consultar('numero=99999')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos).toEqual([])
    })

    it('com o campo vazio, mantém a consulta de todos os pedidos (IND-02)', async () => {
      mocks.pedidos.push(pedidoComNumero('ped_1', '70435'), pedidoComNumero('ped_2', '70436'))

      expect((await consultar('numero=')).body.pedidos).toHaveLength(2)
      expect((await consultar('numero=%20%20')).body.pedidos).toHaveLength(2)
      expect((await consultar('')).body.pedidos).toHaveLength(2)
    })

    it('não usa o id interno do pedido como número comercial (IND-02)', async () => {
      mocks.pedidos.push(pedidoComNumero('ped_1', '70435'))

      expect((await consultar('numero=ped_1')).body.pedidos).toEqual([])
    })

    it('combina a pesquisa com o filtro de setor (IND-02)', async () => {
      mocks.pedidos.push(
        pedidoComNumero('ped_1', '70435', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
        pedidoComNumero('ped_2', '70436', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
        pedidoComNumero('ped_3', '70437', [{ sectorCode: 'REVENDA', status: 'PENDING' }]),
      )

      const resposta = await consultar('numero=7043&setor=TELHAS')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos.map((l: { numero: string }) => l.numero).sort()).toEqual([
        '70435',
        '70436',
      ])
    })

    it('combina a pesquisa com o filtro de período (IND-02, AD-014)', async () => {
      mocks.pedidos.push(
        pedidoComNumero('ped_1', '70435', undefined, '2026-10-22T12:00:00.000-03:00'),
        pedidoComNumero('ped_2', '704350', undefined, '2026-10-23T12:00:00.000-03:00'),
      )

      const resposta = await consultar('numero=70435&de=2026-10-22&ate=2026-10-22')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['70435'])
    })

    it('combina a pesquisa com o filtro de status (IND-02)', async () => {
      mocks.pedidos.push(
        pedidoComNumero('ped_1', '70435', [{ sectorCode: 'TELHAS', status: 'COMPLETED' }]),
        pedidoComNumero('ped_2', '70436', [{ sectorCode: 'TELHAS', status: 'PENDING' }]),
      )

      const resposta = await consultar('numero=7043&status=COMPLETED')

      expect(resposta.status).toBe(200)
      expect(resposta.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['70435'])
    })

    it('encontra pedido fora dos 20 primeiros da ordenação padrão (IND-02, QF-07)', async () => {
      mocks.pedidos.push(
        ...Array.from({ length: 25 }, (_, indice) =>
          pedidoComNumero(
            `ped_${String(indice).padStart(2, '0')}`,
            String(70000 + indice),
            undefined,
            new Date(2026, 0, 1, 0, indice).toISOString(),
          ),
        ),
      )

      expect((await consultar('')).body.pedidos.map((l: { id: string }) => l.id)).not.toContain(
        'ped_00',
      )

      const resposta = await consultar('numero=70000')

      expect(resposta.body.pedidos.map((l: { id: string }) => l.id)).toEqual(['ped_00'])
    })

    it('aplica a pesquisa para o Vendedor e para o Gerente (IND-11)', async () => {
      mocks.perfis.user_gerente = ['PRODUCTION_MANAGER']
      mocks.pedidos.push(pedidoComNumero('ped_1', '70435'), pedidoComNumero('ped_2', '70436'))

      const vendedor = await consultar('numero=70435', 'user_vendedor')
      const gerente = await consultar('numero=70435', 'user_gerente')

      expect(vendedor.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['70435'])
      expect(gerente.body.pedidos.map((l: { numero: string }) => l.numero)).toEqual(['70435'])
    })

    it('mantém a recusa de acesso sem perfil quando há pesquisa de número (IND-11)', async () => {
      mocks.pedidos.push(pedidoComNumero('ped_1', '70435'))

      const resposta = await consultar('numero=70435', 'user_sem_perfil')

      expect(resposta.status).toBe(403)
    })
  })
})
