import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { AtividadeNaoEncontradaError } from './registrar-execucao'
import {
  formatarPendenteOrdem,
  montarOrdemProducao,
  type DadosOrdemProducao,
  type OrdemProducaoRepository,
} from './ordem-producao'

function dados(
  overrides: Partial<DadosOrdemProducao> & Pick<DadosOrdemProducao, 'atividadeId'>,
): DadosOrdemProducao {
  return {
    atividadeId: overrides.atividadeId,
    pedido: '70435',
    item: 'TELHA ONDULADA',
    setor: 'Telhas',
    unidade: 'M',
    solicitado: new Prisma.Decimal(10),
    executado: new Prisma.Decimal(8),
    ...overrides,
  }
}

function createRepo(registros: DadosOrdemProducao[]): OrdemProducaoRepository {
  return {
    async buscarOrdemProducao(atividadeId) {
      const found = registros.find((candidate) => candidate.atividadeId === atividadeId)
      return found ? { ...found } : null
    },
  }
}

describe('montarOrdemProducao', () => {
  it('retorna pedido, item e setor da atividade', async () => {
    const repo = createRepo([dados({ atividadeId: 'act_1' })])

    const ordem = await montarOrdemProducao('act_1', repo)

    expect(ordem.pedido).toBe('70435')
    expect(ordem.item).toBe('TELHA ONDULADA')
    expect(ordem.setor).toBe('Telhas')
  })

  it('retorna solicitado, executado e pendente', async () => {
    const repo = createRepo([dados({ atividadeId: 'act_1' })])

    const ordem = await montarOrdemProducao('act_1', repo)

    expect(ordem.solicitado.toString()).toBe('10')
    expect(ordem.executado.toString()).toBe('8')
    expect(ordem.pendente.toString()).toBe('2')
  })

  it('retorna pendente zero quando o executado ultrapassa o solicitado', async () => {
    const repo = createRepo([
      dados({
        atividadeId: 'act_1',
        solicitado: new Prisma.Decimal(10),
        executado: new Prisma.Decimal(13),
      }),
    ])

    const ordem = await montarOrdemProducao('act_1', repo)

    expect(ordem.pendente.toString()).toBe('0')
  })

  it('rejeita quando a atividade não existe', async () => {
    const repo = createRepo([])

    await expect(montarOrdemProducao('act_x', repo)).rejects.toBeInstanceOf(
      AtividadeNaoEncontradaError,
    )
  })

  it('formata o pendente conforme a unidade do item', async () => {
    const repo = createRepo([dados({ atividadeId: 'act_1', unidade: 'M' })])

    const ordem = await montarOrdemProducao('act_1', repo)

    expect(formatarPendenteOrdem(ordem)).toBe('2.00')
  })
})
