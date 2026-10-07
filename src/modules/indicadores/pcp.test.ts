import { Prisma } from '@/generated/prisma/client'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  montarPcp,
  type AtividadeComPrazo,
  type ExecucaoIndicador,
  type PcpRepository,
} from './pcp'

function execucao(sectorId: string, quantidade: number): ExecucaoIndicador {
  return { sectorId, quantidade: new Prisma.Decimal(quantidade) }
}

function atividade(
  id: string,
  sectorId: string,
  overrides: Partial<AtividadeComPrazo> = {},
): AtividadeComPrazo {
  return {
    id,
    sectorId,
    status: overrides.status ?? 'COMPLETED',
    deadlineAt: overrides.deadlineAt ?? null,
    completedAt: overrides.completedAt ?? null,
  }
}

function createRepo(
  input: { execucoes?: ExecucaoIndicador[]; atividades?: AtividadeComPrazo[] } = {},
): PcpRepository {
  const execucoes = input.execucoes ?? []
  const atividades = input.atividades ?? []
  return {
    async listarExecucoes() {
      return execucoes.map((e) => ({ ...e }))
    },
    async listarAtividadesComPrazo() {
      return atividades.map((a) => ({ ...a }))
    },
  }
}

describe('montarPcp', () => {
  it('soma as execuções por setor (IND-07)', async () => {
    const repo = createRepo({
      execucoes: [execucao('setor_telhas', 4), execucao('setor_telhas', 6)],
    })

    const pcp = await montarPcp(repo)

    expect(pcp.producaoPorSetor).toHaveLength(1)
    expect(pcp.producaoPorSetor[0].sectorId).toBe('setor_telhas')
    expect(pcp.producaoPorSetor[0].quantidade.toString()).toBe('10')
  })

  it('separa a produção por setor (IND-07)', async () => {
    const repo = createRepo({
      execucoes: [execucao('setor_telhas', 5), execucao('setor_corte', 3)],
    })

    const pcp = await montarPcp(repo)

    expect(pcp.producaoPorSetor.map((linha) => [linha.sectorId, linha.quantidade.toString()])).toEqual(
      [
        ['setor_corte', '3'],
        ['setor_telhas', '5'],
      ],
    )
  })

  it('calcula o cumprimento de prazo das concluídas com prazo (IND-08)', async () => {
    const repo = createRepo({
      atividades: [
        atividade('a1', 'setor_telhas', {
          deadlineAt: new Date('2026-06-10T00:00:00.000Z'),
          completedAt: new Date('2026-06-09T00:00:00.000Z'),
        }),
        atividade('a2', 'setor_telhas', {
          deadlineAt: new Date('2026-06-10T00:00:00.000Z'),
          completedAt: new Date('2026-06-11T00:00:00.000Z'),
        }),
        atividade('a3', 'setor_corte', {
          deadlineAt: new Date('2026-06-10T00:00:00.000Z'),
          completedAt: new Date('2026-06-10T00:00:00.000Z'),
        }),
      ],
    })

    const pcp = await montarPcp(repo)

    expect(pcp.cumprimentoPrazo.concluidasComPrazo).toBe(3)
    expect(pcp.cumprimentoPrazo.concluidasNoPrazo).toBe(2)
    expect(pcp.cumprimentoPrazo.percentual).toBeCloseTo(66.67, 2)
  })

  it('ignora atividades sem prazo no cumprimento (IND-08)', async () => {
    const repo = createRepo({
      atividades: [
        atividade('a1', 'setor_telhas', {
          deadlineAt: new Date('2026-06-10T00:00:00.000Z'),
          completedAt: new Date('2026-06-09T00:00:00.000Z'),
        }),
        atividade('a2', 'setor_corte', {
          completedAt: new Date('2026-06-20T00:00:00.000Z'),
        }),
      ],
    })

    const pcp = await montarPcp(repo)

    expect(pcp.cumprimentoPrazo.concluidasComPrazo).toBe(1)
    expect(pcp.cumprimentoPrazo.concluidasNoPrazo).toBe(1)
    expect(pcp.cumprimentoPrazo.percentual).toBe(100)
  })

  it('retorna percentual zero sem concluídas com prazo (IND-08)', async () => {
    const repo = createRepo({
      atividades: [
        atividade('a1', 'setor_telhas', {
          status: 'PENDING',
          deadlineAt: new Date('2026-06-10T00:00:00.000Z'),
        }),
        atividade('a2', 'setor_corte', { completedAt: new Date('2026-06-20T00:00:00.000Z') }),
      ],
    })

    const pcp = await montarPcp(repo)

    expect(pcp.cumprimentoPrazo).toEqual({
      concluidasComPrazo: 0,
      concluidasNoPrazo: 0,
      percentual: 0,
    })
  })

  it('calcula os indicadores apenas com dados do banco do app (IND-09)', () => {
    const fonte = readFileSync(new URL('./pcp.ts', import.meta.url), 'utf8')

    expect(fonte).not.toMatch(/conector|legado|integracao/i)
  })
})
