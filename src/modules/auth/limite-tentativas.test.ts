import { describe, expect, it } from 'vitest'
import { LimitadorTentativas } from './limite-tentativas'

function criar(overrides: { maxFalhas?: number; janelaMs?: number; bloqueioMs?: number } = {}) {
  let agora = 1_000_000
  const limitador = new LimitadorTentativas({
    maxFalhas: overrides.maxFalhas ?? 3,
    janelaMs: overrides.janelaMs ?? 60_000,
    bloqueioMs: overrides.bloqueioMs ?? 120_000,
    agora: () => agora,
  })
  return { limitador, avancar: (ms: number) => (agora += ms) }
}

describe('LimitadorTentativas', () => {
  it('libera antes do limite e bloqueia na falha limite', () => {
    const { limitador } = criar()

    limitador.registrarFalha('ip|ana')
    limitador.registrarFalha('ip|ana')
    expect(limitador.verificar('ip|ana')).toEqual({ bloqueado: false, restanteMs: 0 })

    limitador.registrarFalha('ip|ana')
    const bloqueio = limitador.verificar('ip|ana')
    expect(bloqueio.bloqueado).toBe(true)
    expect(bloqueio.restanteMs).toBe(120_000)
  })

  it('mantém o bloqueio pelo tempo configurado e libera depois', () => {
    const { limitador, avancar } = criar()

    for (let i = 0; i < 3; i += 1) limitador.registrarFalha('ip|ana')
    avancar(60_000)
    expect(limitador.verificar('ip|ana').bloqueado).toBe(true)

    avancar(60_001)
    expect(limitador.verificar('ip|ana')).toEqual({ bloqueado: false, restanteMs: 0 })
  })

  it('esquece falhas antigas fora da janela', () => {
    const { limitador, avancar } = criar()

    limitador.registrarFalha('ip|ana')
    limitador.registrarFalha('ip|ana')
    avancar(61_000)
    limitador.registrarFalha('ip|ana')
    limitador.registrarFalha('ip|ana')

    // As duas primeiras expiraram: com 2 falhas novas ainda não bloqueia.
    expect(limitador.verificar('ip|ana').bloqueado).toBe(false)
  })

  it('limpa o histórico após login bem-sucedido', () => {
    const { limitador } = criar()

    limitador.registrarFalha('ip|ana')
    limitador.registrarFalha('ip|ana')
    limitador.limpar('ip|ana')
    limitador.registrarFalha('ip|ana')

    expect(limitador.verificar('ip|ana').bloqueado).toBe(false)
  })

  it('isola identificadores diferentes', () => {
    const { limitador } = criar()

    for (let i = 0; i < 3; i += 1) limitador.registrarFalha('ip|ana')

    expect(limitador.verificar('ip|ana').bloqueado).toBe(true)
    expect(limitador.verificar('outro-ip|ana').bloqueado).toBe(false)
    expect(limitador.verificar('ip|bia').bloqueado).toBe(false)
  })

  it('remove registros expirados', () => {
    const { limitador, avancar } = criar()

    for (let i = 0; i < 3; i += 1) limitador.registrarFalha('ip|ana')
    avancar(200_000)
    limitador.limparExpirados()

    expect(limitador.verificar('ip|ana')).toEqual({ bloqueado: false, restanteMs: 0 })
  })
})
