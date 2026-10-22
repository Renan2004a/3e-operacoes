import { describe, expect, it } from 'vitest'
import {
  LIMITE_MOTIVO_CORRECAO,
  contarCaracteresMotivo,
  normalizarMotivoCorrecao,
  validarMotivoCorrecao,
} from './motivo-correcao'

describe('motivo de correção de setor', () => {
  it('usa o limite de 500 caracteres Unicode', () => {
    expect(LIMITE_MOTIVO_CORRECAO).toBe(500)
  })

  it('conta pontos de código, de modo que um emoji simples vale 1', () => {
    expect(contarCaracteresMotivo('😀')).toBe(1)
    expect(contarCaracteresMotivo('ab😀')).toBe(3)
  })

  it('normaliza removendo espaços das bordas e tratando vazio como ausente', () => {
    expect(normalizarMotivoCorrecao('  Erro de cadastro  ')).toBe('Erro de cadastro')
    expect(normalizarMotivoCorrecao('   ')).toBeNull()
    expect(normalizarMotivoCorrecao(null)).toBeNull()
  })

  it('exige motivo para perfis que o pedem, inclusive quando só há espaços', () => {
    expect(validarMotivoCorrecao('', true)).toBe('reason_required')
    expect(validarMotivoCorrecao('   ', true)).toBe('reason_required')
    expect(validarMotivoCorrecao(null, true)).toBe('reason_required')
  })

  it('não exige motivo quando o perfil não o pede', () => {
    expect(validarMotivoCorrecao(null, false)).toBeNull()
    expect(validarMotivoCorrecao('   ', false)).toBeNull()
  })

  it('aceita exatamente 500 caracteres e rejeita 501', () => {
    expect(validarMotivoCorrecao('a'.repeat(500), true)).toBeNull()
    expect(validarMotivoCorrecao('a'.repeat(501), true)).toBe('reason_too_long')
  })

  it('conta emojis como um caractere no limite', () => {
    expect(validarMotivoCorrecao(`${'a'.repeat(499)}😀`, true)).toBeNull()
    expect(validarMotivoCorrecao(`${'a'.repeat(500)}😀`, true)).toBe('reason_too_long')
  })

  it('desconsidera espaços das bordas ao aplicar o limite', () => {
    expect(validarMotivoCorrecao(`  ${'a'.repeat(500)}  `, true)).toBeNull()
  })
})
