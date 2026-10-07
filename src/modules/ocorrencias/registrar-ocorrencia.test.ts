import { Prisma } from '@/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import {
  AtividadeNaoEncontradaError,
  OperadorForaDoSetorError,
} from '../producao/registrar-execucao'
import { QuantidadeInvalidaError } from '../producao/unidades'
import { MotivoInvalidoError, type MotivoOcorrencia } from './motivos'
import {
  MotivoObrigatorioError,
  registrarOcorrencia,
  type AtividadeParaOcorrencia,
  type Ocorrencia,
  type OcorrenciaRepository,
} from './registrar-ocorrencia'

const NOW = new Date('2026-10-07T12:00:00.000Z')

function atividade(
  overrides: Partial<AtividadeParaOcorrencia> & Pick<AtividadeParaOcorrencia, 'id'>,
): AtividadeParaOcorrencia {
  return {
    id: overrides.id,
    sectorId: overrides.sectorId ?? 'setor_corte',
    unidade: overrides.unidade ?? 'UN',
  }
}

function motivo(
  overrides: Partial<MotivoOcorrencia> & Pick<MotivoOcorrencia, 'id'>,
): MotivoOcorrencia {
  return {
    id: overrides.id,
    tipo: overrides.tipo ?? 'PERDA',
    codigo: overrides.codigo ?? overrides.id,
    descricao: overrides.descricao ?? 'Motivo',
    ativo: overrides.ativo ?? true,
  }
}

function createDeps(
  seed: {
    atividades?: AtividadeParaOcorrencia[]
    motivos?: MotivoOcorrencia[]
    vinculos?: string[]
    producao?: Prisma.Decimal[]
  } = {},
) {
  const atividades = [...(seed.atividades ?? [])]
  const motivos = [...(seed.motivos ?? [])]
  const vinculos = new Set(seed.vinculos ?? ['user_1:setor_corte'])
  const producao = [...(seed.producao ?? [])]
  const ocorrencias: Ocorrencia[] = []
  let seq = 0

  const repo: OcorrenciaRepository = {
    async listarMotivosPorTipo(tipo) {
      return motivos.filter((candidate) => candidate.tipo === tipo)
    },
    async buscarMotivoPorId(motivoId) {
      return motivos.find((candidate) => candidate.id === motivoId) ?? null
    },
    async buscarAtividadeParaOcorrencia(atividadeId) {
      const found = atividades.find((candidate) => candidate.id === atividadeId)
      return found ? { ...found } : null
    },
    async usuarioPertenceAoSetor(usuarioId, sectorId) {
      return vinculos.has(`${usuarioId}:${sectorId}`)
    },
    async registrarOcorrencia(input) {
      seq += 1
      const ocorrencia: Ocorrencia = {
        id: `oco_${seq}`,
        activityId: input.atividadeId,
        userId: input.usuarioId,
        tipo: input.tipo,
        quantidade: input.quantidade,
        duracaoMin: input.duracaoMin,
        motivoId: input.motivoId,
        observacao: input.observacao,
        occurredAt: input.occurredAt,
      }
      ocorrencias.push(ocorrencia)
      return ocorrencia
    },
  }

  return { repo, ocorrencias, producao }
}

describe('registrarOcorrencia', () => {
  it('persiste a perda com usuário e data/hora (OCO-01, OCO-06)', async () => {
    const { repo, ocorrencias } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'UN' })],
      motivos: [motivo({ id: 'm_perda', tipo: 'PERDA' })],
    })

    const result = await registrarOcorrencia(
      {
        atividadeId: 'act_1',
        usuarioId: 'user_1',
        tipo: 'PERDA',
        quantidade: '2',
        motivoId: 'm_perda',
        observacao: 'peça trincada',
        occurredAt: NOW,
      },
      repo,
    )

    expect(result.activityId).toBe('act_1')
    expect(result.userId).toBe('user_1')
    expect(result.tipo).toBe('PERDA')
    expect(result.quantidade?.toString()).toBe('2')
    expect(result.motivoId).toBe('m_perda')
    expect(result.observacao).toBe('peça trincada')
    expect(result.occurredAt).toBe(NOW)
    expect(ocorrencias).toHaveLength(1)
  })

  it('persiste o refugo com motivo válido respeitando a unidade (OCO-01)', async () => {
    const { repo } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'M' })],
      motivos: [motivo({ id: 'm_refugo', tipo: 'REFUGO' })],
    })

    const result = await registrarOcorrencia(
      { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'REFUGO', quantidade: '3.5', motivoId: 'm_refugo' },
      repo,
    )

    expect(result.tipo).toBe('REFUGO')
    expect(result.quantidade?.toString()).toBe('3.5')
  })

  it('persiste a indisponibilidade com motivo válido (OCO-01)', async () => {
    const { repo } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'UN' })],
      motivos: [motivo({ id: 'm_indisp', tipo: 'INDISPONIBILIDADE' })],
    })

    const result = await registrarOcorrencia(
      { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'INDISPONIBILIDADE', quantidade: '1', motivoId: 'm_indisp' },
      repo,
    )

    expect(result.tipo).toBe('INDISPONIBILIDADE')
    expect(result.motivoId).toBe('m_indisp')
  })

  it('rejeita perda, refugo e indisponibilidade sem motivo (OCO-02)', async () => {
    const { repo, ocorrencias } = createDeps({ atividades: [atividade({ id: 'act_1' })] })

    for (const tipo of ['PERDA', 'REFUGO', 'INDISPONIBILIDADE'] as const) {
      await expect(
        registrarOcorrencia(
          { atividadeId: 'act_1', usuarioId: 'user_1', tipo, quantidade: '1' },
          repo,
        ),
      ).rejects.toBeInstanceOf(MotivoObrigatorioError)
    }
    expect(ocorrencias).toHaveLength(0)
  })

  it('rejeita motivo inexistente, inativo ou de outro tipo (OCO-03)', async () => {
    const { repo, ocorrencias } = createDeps({
      atividades: [atividade({ id: 'act_1' })],
      motivos: [
        motivo({ id: 'inativo', tipo: 'PERDA', ativo: false }),
        motivo({ id: 'de_refugo', tipo: 'REFUGO' }),
      ],
    })

    for (const motivoId of ['nao_existe', 'inativo', 'de_refugo']) {
      await expect(
        registrarOcorrencia(
          { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'PERDA', quantidade: '1', motivoId },
          repo,
        ),
      ).rejects.toBeInstanceOf(MotivoInvalidoError)
    }
    expect(ocorrencias).toHaveLength(0)
  })

  it('rejeita quantidade fracionária em peça (OCO-04)', async () => {
    const { repo, ocorrencias } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'UN' })],
      motivos: [motivo({ id: 'm_perda', tipo: 'PERDA' })],
    })

    await expect(
      registrarOcorrencia(
        { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'PERDA', quantidade: '2.5', motivoId: 'm_perda' },
        repo,
      ),
    ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    expect(ocorrencias).toHaveLength(0)
  })

  it('rejeita quantidade zero ou negativa (OCO-13)', async () => {
    const { repo, ocorrencias } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'UN' })],
      motivos: [motivo({ id: 'm_perda', tipo: 'PERDA' })],
    })

    for (const quantidade of ['0', '-2']) {
      await expect(
        registrarOcorrencia(
          { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'PERDA', quantidade, motivoId: 'm_perda' },
          repo,
        ),
      ).rejects.toBeInstanceOf(QuantidadeInvalidaError)
    }
    expect(ocorrencias).toHaveLength(0)
  })

  it('registra perda e refugo sem alterar o saldo de produção (OCO-05)', async () => {
    const { repo, ocorrencias, producao } = createDeps({
      atividades: [atividade({ id: 'act_1', unidade: 'UN' })],
      motivos: [
        motivo({ id: 'm_perda', tipo: 'PERDA' }),
        motivo({ id: 'm_refugo', tipo: 'REFUGO' }),
      ],
      producao: [new Prisma.Decimal(4)],
    })

    await registrarOcorrencia(
      { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'PERDA', quantidade: '2', motivoId: 'm_perda' },
      repo,
    )
    await registrarOcorrencia(
      { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'REFUGO', quantidade: '1', motivoId: 'm_refugo' },
      repo,
    )

    expect(producao.map((item) => item.toString())).toEqual(['4'])
    expect(ocorrencias).toHaveLength(2)
    expect(ocorrencias.every((item) => !('saldo' in item))).toBe(true)
  })

  it('registra pausa com duração sem exigir motivo (OCO-12)', async () => {
    const { repo, ocorrencias } = createDeps({ atividades: [atividade({ id: 'act_1' })] })

    const result = await registrarOcorrencia(
      { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'PAUSA', duracaoMin: 30 },
      repo,
    )

    expect(result.tipo).toBe('PAUSA')
    expect(result.duracaoMin).toBe(30)
    expect(result.motivoId).toBeNull()
    expect(result.quantidade).toBeNull()
    expect(ocorrencias).toHaveLength(1)
  })

  it('rejeita motivo inválido informado em pausa (OCO-09)', async () => {
    const { repo, ocorrencias } = createDeps({ atividades: [atividade({ id: 'act_1' })] })

    await expect(
      registrarOcorrencia(
        { atividadeId: 'act_1', usuarioId: 'user_1', tipo: 'PAUSA', duracaoMin: 10, motivoId: 'nao_existe' },
        repo,
      ),
    ).rejects.toBeInstanceOf(MotivoInvalidoError)
    expect(ocorrencias).toHaveLength(0)
  })

  it('rejeita a ocorrência de operador fora do setor (OCO-11)', async () => {
    const { repo, ocorrencias } = createDeps({
      atividades: [atividade({ id: 'act_1', sectorId: 'setor_corte' })],
      vinculos: ['user_2:setor_telhas'],
    })

    await expect(
      registrarOcorrencia(
        { atividadeId: 'act_1', usuarioId: 'user_2', tipo: 'PERDA', quantidade: '1', motivoId: 'm' },
        repo,
      ),
    ).rejects.toBeInstanceOf(OperadorForaDoSetorError)
    expect(ocorrencias).toHaveLength(0)
  })

  it('rejeita quando a atividade não existe (OCO-10)', async () => {
    const { repo, ocorrencias } = createDeps()

    await expect(
      registrarOcorrencia(
        { atividadeId: 'act_x', usuarioId: 'user_1', tipo: 'PAUSA', duracaoMin: 5 },
        repo,
      ),
    ).rejects.toBeInstanceOf(AtividadeNaoEncontradaError)
    expect(ocorrencias).toHaveLength(0)
  })
})
