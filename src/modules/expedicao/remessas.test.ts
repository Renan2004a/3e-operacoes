import { describe, expect, it } from 'vitest'
import {
  RemessaDuplicadaError,
  RemessaInvalidaError,
  RemessaNaoEncontradaError,
  confirmarRemessa,
  interpretarDataPrevista,
  programarRemessa,
  removerRemessa,
  type Remessa,
  type RemessaRepository,
} from './remessas'

function createRepo(seed: Remessa[] = []) {
  const remessas = [...seed]
  const repo: RemessaRepository = {
    async listarPorItem(orderItemId) {
      return remessas.filter((remessa) => remessa.orderItemId === orderItemId)
    },
    async listarPorPedido() {
      return [...remessas]
    },
    async buscar(id) {
      return remessas.find((remessa) => remessa.id === id) ?? null
    },
    async buscarPorNumero(orderItemId, remessa) {
      return (
        remessas.find(
          (item) => item.orderItemId === orderItemId && item.remessa === remessa,
        ) ?? null
      )
    },
    async criar(input) {
      const criada: Remessa = { id: `r${remessas.length + 1}`, confirmedAt: null, ...input }
      remessas.push(criada)
      return criada
    },
    async confirmar(id, now) {
      const remessa = remessas.find((item) => item.id === id)
      if (!remessa) return null
      remessa.confirmedAt = now
      return remessa
    },
    async remover(id) {
      const indice = remessas.findIndex((remessa) => remessa.id === id)
      if (indice < 0) return false
      remessas.splice(indice, 1)
      return true
    },
  }
  return { repo, remessas }
}

function remessa(overrides: Partial<Remessa> = {}): Remessa {
  return {
    id: 'r1',
    orderItemId: 'i1',
    remessa: 1,
    scheduledAt: new Date('2026-02-01T00:00:00Z'),
    confirmedAt: null,
    note: null,
    ...overrides,
  }
}

describe('programarRemessa', () => {
  it('cria a remessa com número e data prevista', async () => {
    const { repo, remessas } = createRepo()
    const criada = await programarRemessa(
      { orderItemId: 'i1', remessa: 2, scheduledAt: new Date('2026-03-01T00:00:00Z') },
      repo,
    )
    expect(criada.remessa).toBe(2)
    expect(criada.orderItemId).toBe('i1')
    expect(remessas).toHaveLength(1)
  })

  it('rejeita número de remessa repetido para o mesmo item', async () => {
    const { repo } = createRepo([remessa()])
    await expect(
      programarRemessa({ orderItemId: 'i1', remessa: 1, scheduledAt: new Date() }, repo),
    ).rejects.toBeInstanceOf(RemessaDuplicadaError)
  })

  it('rejeita número de remessa inválido', async () => {
    const { repo } = createRepo()
    await expect(
      programarRemessa({ orderItemId: 'i1', remessa: 0, scheduledAt: new Date() }, repo),
    ).rejects.toBeInstanceOf(RemessaInvalidaError)
  })

  it('rejeita data inválida', async () => {
    const { repo } = createRepo()
    await expect(
      programarRemessa({ orderItemId: 'i1', remessa: 1, scheduledAt: new Date('invalida') }, repo),
    ).rejects.toBeInstanceOf(RemessaInvalidaError)
  })
})

describe('confirmarRemessa', () => {
  it('marca a data de confirmação', async () => {
    const { repo } = createRepo([remessa()])
    const agora = new Date('2026-02-05T00:00:00Z')
    const confirmada = await confirmarRemessa({ id: 'r1', now: agora }, repo)
    expect(confirmada.confirmedAt).toEqual(agora)
  })

  it('erro quando a remessa não existe', async () => {
    const { repo } = createRepo()
    await expect(
      confirmarRemessa({ id: 'inexistente', now: new Date() }, repo),
    ).rejects.toBeInstanceOf(RemessaNaoEncontradaError)
  })
})

describe('removerRemessa', () => {
  it('remove a remessa programada', async () => {
    const { repo, remessas } = createRepo([remessa()])
    await removerRemessa({ id: 'r1' }, repo)
    expect(remessas).toHaveLength(0)
  })

  it('erro quando a remessa não existe', async () => {
    const { repo } = createRepo()
    await expect(removerRemessa({ id: 'inexistente' }, repo)).rejects.toBeInstanceOf(
      RemessaNaoEncontradaError,
    )
  })
})

describe('interpretarDataPrevista', () => {
  it('ancora data somente-dia ao meio-dia de São Paulo (não volta um dia)', () => {
    const data = interpretarDataPrevista('2026-12-15')
    expect(data.toISOString()).toBe('2026-12-15T15:00:00.000Z')
    expect(
      new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(data),
    ).toBe('15/12/2026')
  })

  it('mantém datas com hora completas', () => {
    const data = interpretarDataPrevista('2026-12-15T00:00:00.000Z')
    expect(data.toISOString()).toBe('2026-12-15T00:00:00.000Z')
  })
})
