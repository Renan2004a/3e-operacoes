import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import type { ActivityStatus } from './tipos'
import {
  AtividadeNaoEncontradaError,
  OperadorForaDoSetorError,
  registrarExecucao,
  type AtividadeParaExecucao,
  type Execucao,
  type ExecucaoRepository,
} from './registrar-execucao'
import { QuantidadeInvalidaError } from './unidades'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function atividade(
  overrides: Partial<AtividadeParaExecucao> & Pick<AtividadeParaExecucao, 'id'>,
): AtividadeParaExecucao {
  return {
    id: overrides.id,
    sectorId: 'setor_telhas',
    unidade: 'M',
    solicitado: new Prisma.Decimal(10),
    ...overrides,
  }
}

function createDeps(
  seed: {
    atividades?: AtividadeParaExecucao[]
    vinculos?: string[]
    execucoes?: Execucao[]
  } = {},
) {
  const atividades = [...(seed.atividades ?? [])]
  const execucoes = [...(seed.execucoes ?? [])]
  const vinculos = new Set(seed.vinculos ?? ['user_1:setor_telhas'])
  const status = new Map<string, ActivityStatus>()
  let seq = 0

  const repo: ExecucaoRepository = {
    async buscarAtividadeParaExecucao(id) {
      const found = atividades.find((candidate) => candidate.id === id)
      return found ? { ...found } : null
    },
    async usuarioPertenceAoSetor(usuarioId, sectorId) {
      return vinculos.has(`${usuarioId}:${sectorId}`)
    },
    async registrarExecucao({ atividadeId, usuarioId, quantidade, occurredAt, resolverStatus }) {
      const executadoTotal = execucoes
        .filter((candidate) => candidate.activityId === atividadeId)
        .reduce((total, candidate) => total.plus(candidate.quantidade), new Prisma.Decimal(0))
        .plus(quantidade)
      const novoStatus = resolverStatus(executadoTotal)
      seq += 1
      const execucao: Execucao = {
        id: `exec_${seq}`,
        activityId: atividadeId,
        userId: usuarioId,
        quantidade,
        occurredAt,
      }
      execucoes.push(execucao)
      status.set(atividadeId, novoStatus)
      return { execucao, executadoTotal, status: novoStatus }
    },
  }

  return { repo, atividades, execucoes, status }
}

describe('registrarExecucao', () => {
  it('persiste a execução com usuário e data/hora', async () => {
    const { repo, execucoes } = createDeps({ atividades: [atividade({ id: 'act_1' })] })

    const result = await registrarExecucao(
      { atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '4', occurredAt: NOW },
      repo,
    )

    expect(execucoes).toHaveLength(1)
    expect(execucoes[0].userId).toBe('user_1')
    expect(execucoes[0].occurredAt).toBe(NOW)
    expect(execucoes[0].quantidade.toString()).toBe('4')
    expect(result.execucao.id).toBe('exec_1')
  })

  it('rejeita quantidade fracionária em peça', async () => {
    const { repo, execucoes, status } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'UN', sectorId: 'setor_telhas' })],
    })

    await expect(
      registrarExecucao({ atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '2.5' }, repo),
    ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    expect(execucoes).toHaveLength(0)
    expect(status.has('act_1')).toBe(false)
  })

  it('rejeita quantidade zero ou negativa', async () => {
    const { repo, execucoes } = createDeps({ atividades: [atividade({ id: 'act_1' })] })

    await expect(
      registrarExecucao({ atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '0' }, repo),
    ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    await expect(
      registrarExecucao({ atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '-2' }, repo),
    ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    expect(execucoes).toHaveLength(0)
  })

  it('marca COMPLETED quando a soma alcança o solicitado', async () => {
    const { repo, status } = createDeps({
      atividades: [atividade({ id: 'act_1', solicitado: new Prisma.Decimal(10) })],
    })

    const result = await registrarExecucao(
      { atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '10', occurredAt: NOW },
      repo,
    )

    expect(result.status).toBe('COMPLETED')
    expect(status.get('act_1')).toBe('COMPLETED')
    expect(result.saldo.pendente.toString()).toBe('0')
  })

  it('marca DIVERGENT quando a soma ultrapassa o solicitado', async () => {
    const { repo, status } = createDeps({
      atividades: [atividade({ id: 'act_1', solicitado: new Prisma.Decimal(10) })],
    })

    const result = await registrarExecucao(
      { atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '12', occurredAt: NOW },
      repo,
    )

    expect(result.status).toBe('DIVERGENT')
    expect(status.get('act_1')).toBe('DIVERGENT')
    expect(result.saldo.pendente.toString()).toBe('0')
  })

  it('marca IN_PROGRESS enquanto a soma fica abaixo do solicitado', async () => {
    const { repo, status } = createDeps({
      atividades: [atividade({ id: 'act_1', solicitado: new Prisma.Decimal(10) })],
    })

    const result = await registrarExecucao(
      { atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '4', occurredAt: NOW },
      repo,
    )

    expect(result.status).toBe('IN_PROGRESS')
    expect(status.get('act_1')).toBe('IN_PROGRESS')
    expect(result.saldo.pendente.toString()).toBe('6')
  })

  it('considera as execuções anteriores ao calcular o total', async () => {
    const { repo, status } = createDeps({
      atividades: [atividade({ id: 'act_1', solicitado: new Prisma.Decimal(10) })],
      execucoes: [
        {
          id: 'exec_0',
          activityId: 'act_1',
          userId: 'user_1',
          quantidade: new Prisma.Decimal(6),
          occurredAt: NOW,
        },
      ],
    })

    const result = await registrarExecucao(
      { atividadeId: 'act_1', usuarioId: 'user_1', quantidade: '4', occurredAt: NOW },
      repo,
    )

    expect(result.status).toBe('COMPLETED')
    expect(status.get('act_1')).toBe('COMPLETED')
  })

  it('rejeita a execução de operador fora do setor da atividade', async () => {
    const { repo, execucoes } = createDeps({
      atividades: [atividade({ id: 'act_1', sectorId: 'setor_telhas' })],
      vinculos: ['user_2:setor_corte'],
    })

    await expect(
      registrarExecucao({ atividadeId: 'act_1', usuarioId: 'user_2', quantidade: '1' }, repo),
    ).rejects.toBeInstanceOf(OperadorForaDoSetorError)
    expect(execucoes).toHaveLength(0)
  })

  it('rejeita quando a atividade não existe', async () => {
    const { repo, execucoes } = createDeps()

    await expect(
      registrarExecucao({ atividadeId: 'act_x', usuarioId: 'user_1', quantidade: '1' }, repo),
    ).rejects.toBeInstanceOf(AtividadeNaoEncontradaError)
    expect(execucoes).toHaveLength(0)
  })
})
