import { describe, expect, it } from 'vitest'
import { sugerirSetor, type RegraProdutoSetor } from './sugerir-setor'

const regras: RegraProdutoSetor[] = [
  { matchType: 'CONTAINS', matchValue: 'telha', sectorId: 'setor_telhas', priority: 10 },
  { matchType: 'CONTAINS', matchValue: 'perfil', sectorId: 'setor_corte', priority: 10 },
  { matchType: 'PREFIX', matchValue: '9', sectorId: 'setor_revenda', priority: 5 },
]

describe('sugerirSetor', () => {
  it('sugere pelo termo na descrição', () => {
    expect(sugerirSetor({ productCode: '470', description: 'Telha termoac. eps30' }, regras)).toBe(
      'setor_telhas',
    )
    expect(sugerirSetor({ productCode: '514', description: 'Perfil UE 100x40' }, regras)).toBe(
      'setor_corte',
    )
  })

  it('sugere pelo prefixo do código', () => {
    expect(sugerirSetor({ productCode: '9123', description: 'Parafuso' }, regras)).toBe(
      'setor_revenda',
    )
  })

  it('respeita a prioridade entre regras', () => {
    const comPrioridade: RegraProdutoSetor[] = [
      { matchType: 'CONTAINS', matchValue: 'perfil', sectorId: 'baixa', priority: 1 },
      { matchType: 'CONTAINS', matchValue: 'perfil', sectorId: 'alta', priority: 99 },
    ]
    expect(sugerirSetor({ productCode: null, description: 'Perfil UE' }, comPrioridade)).toBe('alta')
  })

  it('retorna null sem correspondência', () => {
    expect(sugerirSetor({ productCode: '1', description: 'Metalom 30x20' }, regras)).toBeNull()
    expect(sugerirSetor({ productCode: null, description: null }, regras)).toBeNull()
  })
})
