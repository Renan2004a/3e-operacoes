import { describe, expect, it } from 'vitest'
import {
  AtividadeNaoEncontradaError,
  ItemNaoEncontradoError,
  PrazoInvalidoError,
  definirPrazoAtividade,
  definirPrazoItem,
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

describe('definirPrazoItem', () => {
  it('persiste o prazo do item (PRAZO-01)', async () => {
    const { repo, prazosItens } = createRepo(['item_1'], [])
    const prazo = new Date('2026-10-15T12:00:00.000Z')

    await definirPrazoItem({ itemId: 'item_1', prazo }, repo)

    expect(prazosItens.get('item_1')).toEqual(prazo)
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
