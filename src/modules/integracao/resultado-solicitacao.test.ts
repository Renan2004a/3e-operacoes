import { describe, expect, it } from 'vitest'
import { classificarOrigemSolicitacao } from './resultado-solicitacao'

describe('classificarOrigemSolicitacao', () => {
  it('marca novo job como nova consulta', () => {
    expect(classificarOrigemSolicitacao(false, 'PENDING')).toBe('NOVA')
  })

  it('marca tentativa ativa reaproveitada como em andamento', () => {
    for (const status of ['PENDING', 'DISPATCHED', 'RUNNING'] as const) {
      expect(classificarOrigemSolicitacao(true, status)).toBe('EM_ANDAMENTO')
    }
  })

  it('marca resultado final reaproveitado como anterior, sem nova consulta', () => {
    for (const status of ['SUCCEEDED', 'FAILED'] as const) {
      expect(classificarOrigemSolicitacao(true, status)).toBe('RESULTADO_ANTERIOR')
    }
  })
})
