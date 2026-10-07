import { describe, expect, it } from 'vitest'
import {
  MOTIVOS_SUGERIDOS,
  MotivoInvalidoError,
  TipoOcorrenciaInvalidoError,
  listarMotivos,
  validarMotivo,
  type MotivoOcorrencia,
  type MotivoRepository,
} from './motivos'

function motivo(overrides: Partial<MotivoOcorrencia> & Pick<MotivoOcorrencia, 'id'>): MotivoOcorrencia {
  return {
    id: overrides.id,
    tipo: overrides.tipo ?? 'PERDA',
    codigo: overrides.codigo ?? overrides.id,
    descricao: overrides.descricao ?? 'Descrição',
    ativo: overrides.ativo ?? true,
  }
}

function createRepo(motivos: MotivoOcorrencia[]): MotivoRepository {
  return {
    async listarMotivosPorTipo(tipo) {
      return motivos.filter((candidate) => candidate.tipo === tipo)
    },
    async buscarMotivoPorId(motivoId) {
      return motivos.find((candidate) => candidate.id === motivoId) ?? null
    },
  }
}

describe('listarMotivos', () => {
  it('retorna apenas os motivos ativos do tipo (OCO-08)', async () => {
    const repo = createRepo([
      motivo({ id: 'perda_ativa', tipo: 'PERDA', ativo: true }),
      motivo({ id: 'perda_inativa', tipo: 'PERDA', ativo: false }),
      motivo({ id: 'refugo_ativa', tipo: 'REFUGO', ativo: true }),
    ])

    const motivos = await listarMotivos('PERDA', repo)

    expect(motivos.map((item) => item.id)).toEqual(['perda_ativa'])
  })

  it('rejeita tipo de ocorrência desconhecido', async () => {
    const repo = createRepo([motivo({ id: 'm1' })])

    await expect(listarMotivos('INEXISTENTE', repo)).rejects.toBeInstanceOf(
      TipoOcorrenciaInvalidoError,
    )
  })
})

describe('validarMotivo', () => {
  it('aceita motivo ativo do mesmo tipo da ocorrência (OCO-09)', async () => {
    const repo = createRepo([
      motivo({ id: 'm1', tipo: 'REFUGO', codigo: 'CORTE_ERRADO', descricao: 'Corte errado' }),
    ])

    const validado = await validarMotivo('REFUGO', 'm1', repo)

    expect(validado.id).toBe('m1')
    expect(validado.descricao).toBe('Corte errado')
  })

  it('rejeita motivo inexistente (OCO-09)', async () => {
    const repo = createRepo([motivo({ id: 'm1', tipo: 'PERDA' })])

    await expect(validarMotivo('PERDA', 'nao_existe', repo)).rejects.toBeInstanceOf(
      MotivoInvalidoError,
    )
  })

  it('rejeita motivo inativo ou de outro tipo (OCO-09)', async () => {
    const repo = createRepo([
      motivo({ id: 'inativo', tipo: 'PERDA', ativo: false }),
      motivo({ id: 'outro_tipo', tipo: 'REFUGO', ativo: true }),
    ])

    await expect(validarMotivo('PERDA', 'inativo', repo)).rejects.toBeInstanceOf(MotivoInvalidoError)
    await expect(validarMotivo('PERDA', 'outro_tipo', repo)).rejects.toBeInstanceOf(
      MotivoInvalidoError,
    )
  })
})

describe('MOTIVOS_SUGERIDOS', () => {
  it('traz 3 sugestões por tipo, marcadas como sugestão', () => {
    const porTipo = (tipo: string) => MOTIVOS_SUGERIDOS.filter((item) => item.tipo === tipo)

    expect(porTipo('PERDA')).toHaveLength(3)
    expect(porTipo('REFUGO')).toHaveLength(3)
    expect(porTipo('INDISPONIBILIDADE')).toHaveLength(3)
    expect(MOTIVOS_SUGERIDOS.every((item) => item.sugestao === true)).toBe(true)
  })
})
