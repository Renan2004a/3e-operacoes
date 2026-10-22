import { describe, expect, it } from 'vitest'
import { calcularStatusPrazo } from './atraso'
import {
  AtividadeNaoEncontradaError,
  ItemNaoEncontradoError,
  PrazoInvalidoError,
  definirPrazoAtividade,
  definirPrazoItem,
  validarPrazo,
  type PrazoRepository,
} from './prazo'

function createRepo(itens: string[], atividades: string[]) {
  const prazosItens = new Map<string, Date>()
  const prazosAtividades = new Map<string, Date>()
  for (const id of itens) prazosItens.set(id, new Date(0))
  for (const id of atividades) prazosAtividades.set(id, new Date(0))

  const repo: PrazoRepository = {
    async definirPrazoItem({ itemId, prazo }) {
      if (!prazosItens.has(itemId)) return null
      prazosItens.set(itemId, prazo)
      return { id: itemId, deadlineAt: prazo }
    },
    async definirPrazoAtividade({ atividadeId, prazo }) {
      if (!prazosAtividades.has(atividadeId)) return null
      prazosAtividades.set(atividadeId, prazo)
      return { id: atividadeId, deadlineAt: prazo }
    },
  }

  return { repo, prazosItens, prazosAtividades }
}

describe('validarPrazo', () => {
  it('ancora a data somente-dia no fim do dia em America/Sao_Paulo (D2)', () => {
    expect(validarPrazo('2026-02-01').toISOString()).toBe('2026-02-02T02:59:59.999Z')
    expect(validarPrazo('2026-10-22').toISOString()).toBe('2026-10-23T02:59:59.999Z')
  })

  it('respeita o horário de verão histórico (D2)', () => {
    expect(validarPrazo('2018-11-10').toISOString()).toBe('2018-11-11T01:59:59.999Z')
    expect(validarPrazo('2019-02-16').toISOString()).toBe('2019-02-17T02:59:59.999Z')
  })

  it('rejeita formatos ambíguos, datas inexistentes e timestamps (D2)', () => {
    for (const invalido of [
      '01/02/2026',
      '2026-02-30',
      '2026-13-01',
      '2026-2-1',
      '2026-02-01T00:00:00Z',
      'data-invalida',
      '',
      '   ',
      null,
      undefined,
      20260201,
    ]) {
      expect(() => validarPrazo(invalido), String(invalido)).toThrow(PrazoInvalidoError)
    }
  })

  it('aceita um Date válido já resolvido (uso interno)', () => {
    const prazo = new Date('2026-10-15T12:00:00.000Z')
    expect(validarPrazo(prazo)).toBe(prazo)
  })

  it('rejeita um Date inválido', () => {
    expect(() => validarPrazo(new Date('invalida'))).toThrow(PrazoInvalidoError)
  })
})

describe('prazo de hoje e de ontem (D2)', () => {
  // 22/10/2026 20:30 em São Paulo (UTC-03).
  const agora = new Date('2026-10-22T23:30:00.000Z')

  it('não considera atrasado o prazo para a data atual', () => {
    const prazo = validarPrazo('2026-10-22')

    expect(calcularStatusPrazo({ prazo, concluido: false, agora })).toBe('EM_DIA')
  })

  it('considera atrasado o prazo de ontem quando não concluído', () => {
    const prazo = validarPrazo('2026-10-21')

    expect(calcularStatusPrazo({ prazo, concluido: false, agora })).toBe('ATRASADO')
  })

  it('não considera atrasado o prazo de ontem quando já concluído', () => {
    const prazo = validarPrazo('2026-10-21')

    expect(calcularStatusPrazo({ prazo, concluido: true, agora })).toBe('EM_DIA')
  })
})

describe('definirPrazoItem', () => {
  it('persiste o prazo do item (PRAZO-01)', async () => {
    const { repo, prazosItens } = createRepo(['item_1'], [])
    const prazo = new Date('2026-10-15T12:00:00.000Z')

    await definirPrazoItem({ itemId: 'item_1', prazo }, repo)

    expect(prazosItens.get('item_1')).toEqual(prazo)
  })

  it('persiste a data somente-dia no fim do dia (PRAZO-01, D2)', async () => {
    const { repo, prazosItens } = createRepo(['item_1'], [])

    await definirPrazoItem({ itemId: 'item_1', prazo: '2026-02-01' }, repo)

    expect(prazosItens.get('item_1')).toEqual(new Date('2026-02-02T02:59:59.999Z'))
  })

  it('retorna o item com a data persistida (PRAZO-01)', async () => {
    const { repo } = createRepo(['item_1'], [])
    const prazo = new Date('2026-10-15T12:00:00.000Z')

    const resultado = await definirPrazoItem({ itemId: 'item_1', prazo }, repo)

    expect(resultado.id).toBe('item_1')
    expect(resultado.deadlineAt).toEqual(prazo)
  })

  it('rejeita data inválida sem persistir (PRAZO-04)', async () => {
    const { repo, prazosItens } = createRepo(['item_1'], [])

    await expect(
      definirPrazoItem({ itemId: 'item_1', prazo: 'data-invalida' }, repo),
    ).rejects.toBeInstanceOf(PrazoInvalidoError)
    expect(prazosItens.get('item_1')).toEqual(new Date(0))
  })

  it('rejeita item inexistente sem persistir (PRAZO-12)', async () => {
    const { repo, prazosItens } = createRepo(['item_1'], [])

    await expect(
      definirPrazoItem({ itemId: 'item_x', prazo: new Date('2026-10-15T12:00:00.000Z') }, repo),
    ).rejects.toBeInstanceOf(ItemNaoEncontradoError)
    expect(prazosItens.has('item_x')).toBe(false)
  })
})

describe('definirPrazoAtividade', () => {
  it('persiste o prazo da atividade (PRAZO-02)', async () => {
    const { repo, prazosAtividades } = createRepo([], ['act_1'])
    const prazo = new Date('2026-10-20T09:30:00.000Z')

    await definirPrazoAtividade({ atividadeId: 'act_1', prazo }, repo)

    expect(prazosAtividades.get('act_1')).toEqual(prazo)
  })

  it('retorna a atividade com a data persistida (PRAZO-02)', async () => {
    const { repo } = createRepo([], ['act_1'])
    const prazo = new Date('2026-10-20T09:30:00.000Z')

    const resultado = await definirPrazoAtividade({ atividadeId: 'act_1', prazo }, repo)

    expect(resultado.id).toBe('act_1')
    expect(resultado.deadlineAt).toEqual(prazo)
  })

  it('rejeita atividade inexistente sem persistir (PRAZO-11)', async () => {
    const { repo, prazosAtividades } = createRepo([], ['act_1'])

    await expect(
      definirPrazoAtividade(
        { atividadeId: 'act_x', prazo: new Date('2026-10-20T09:30:00.000Z') },
        repo,
      ),
    ).rejects.toBeInstanceOf(AtividadeNaoEncontradaError)
    expect(prazosAtividades.has('act_x')).toBe(false)
  })
})
