import { describe, expect, it } from 'vitest'

import { NAV_POR_PERFIL, rotaInicialDoPerfil } from './navegacao-perfil'

describe('navegacao por perfil', () => {
  it('mostra Pedidos e Ocorrências para o operador', () => {
    expect(NAV_POR_PERFIL.OPERATOR).toEqual([
      { href: '/operador/fila', label: 'Pedidos' },
      { href: '/operador/ocorrencias', label: 'Ocorrências' },
    ])
  })

  it('inclui a fila de produção na navegação do gerente (QF-10)', () => {
    expect(NAV_POR_PERFIL.PRODUCTION_MANAGER).toContainEqual({
      href: '/operador/fila',
      label: 'Fila de produção',
    })
  })

  it('mantém o painel como tela inicial do gerente (QF-10)', () => {
    expect(rotaInicialDoPerfil('PRODUCTION_MANAGER')).toBe('/gerente/painel')
  })

  it('aponta a fila do gerente para a mesma rota de produção do operador (QF-10)', () => {
    const filaGerente = NAV_POR_PERFIL.PRODUCTION_MANAGER.find(
      (item) => item.label === 'Fila de produção',
    )

    expect(filaGerente?.href).toBe(NAV_POR_PERFIL.OPERATOR[0]?.href)
  })

  it('não expõe a fila a perfis sem registrar execução (QF-10)', () => {
    for (const perfil of ['SELLER', 'SHIPPING', 'SYSTEM_RESPONSIBLE'] as const) {
      expect(NAV_POR_PERFIL[perfil].some((item) => item.href === '/operador/fila')).toBe(false)
    }
  })
})
