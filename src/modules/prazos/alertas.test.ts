import { describe, expect, it } from 'vitest'
import {
  listarAtividadesAtrasadas,
  type AlertasRepository,
  type AtividadeComPrazo,
} from './alertas'

const AGORA = new Date('2026-10-10T12:00:00.000Z')
const PASSADO = new Date('2026-10-09T12:00:00.000Z')
const FUTURO = new Date('2026-10-11T12:00:00.000Z')

function atividade(
  overrides: Partial<AtividadeComPrazo> & Pick<AtividadeComPrazo, 'id'>,
): AtividadeComPrazo {
  return {
    orderItemId: `item_${overrides.id}`,
    sectorId: 'setor_telhas',
    status: 'IN_PROGRESS',
    deadlineAt: PASSADO,
    ...overrides,
  }
}

function createRepo(atividades: AtividadeComPrazo[]): AlertasRepository {
  return {
    async listarAtividadesComPrazo() {
      return atividades.map((item) => ({ ...item }))
    },
  }
}

describe('listarAtividadesAtrasadas', () => {
  it('retorna apenas a atividade com prazo ultrapassado e não concluída (PRAZO-10)', async () => {
    const repo = createRepo([
      atividade({ id: 'act_atrasada' }),
      atividade({ id: 'act_futura', deadlineAt: FUTURO }),
    ])

    const alertas = await listarAtividadesAtrasadas(AGORA, repo)

    expect(alertas.map((alerta) => alerta.id)).toEqual(['act_atrasada'])
    expect(alertas[0].deadlineAt).toEqual(PASSADO)
  })

  it('não inclui atividade concluída mesmo com prazo ultrapassado (PRAZO-10)', async () => {
    const repo = createRepo([
      atividade({ id: 'act_concluida', status: 'COMPLETED' }),
      atividade({ id: 'act_atrasada' }),
    ])

    const alertas = await listarAtividadesAtrasadas(AGORA, repo)

    expect(alertas.map((alerta) => alerta.id)).toEqual(['act_atrasada'])
  })

  it('não inclui atividade sem prazo (PRAZO-10)', async () => {
    const repo = createRepo([
      atividade({ id: 'act_sem_prazo', deadlineAt: null }),
      atividade({ id: 'act_atrasada' }),
    ])

    const alertas = await listarAtividadesAtrasadas(AGORA, repo)

    expect(alertas.map((alerta) => alerta.id)).toEqual(['act_atrasada'])
  })

  it('retorna lista vazia quando não há atividades atrasadas (PRAZO-10)', async () => {
    const repo = createRepo([
      atividade({ id: 'act_futura', deadlineAt: FUTURO }),
      atividade({ id: 'act_sem_prazo', deadlineAt: null }),
      atividade({ id: 'act_concluida', status: 'COMPLETED' }),
    ])

    const alertas = await listarAtividadesAtrasadas(AGORA, repo)

    expect(alertas).toEqual([])
  })
})
