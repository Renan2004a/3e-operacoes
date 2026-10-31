import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => {
  const prisma = {
    $transaction: vi.fn(async (fn: (args: unknown) => unknown) => fn({})),
  }
  return { prisma }
})

vi.mock('@/shared/db/prisma', () => ({ prisma: state.prisma }))

import {
  ItemJaClassificadoError,
  ItemNaoEncontradoError,
} from '../classificar-item'
import { prismaUnidadeTrabalhoClassificacao } from './prisma-unidade-trabalho-classificacao'

function erroP2034(): unknown {
  return { code: 'P2034', message: 'deadlock simulado (erro de infraestrutura transitório)' }
}

function conflitoCategoria(): unknown {
  return { code: 'P2002', meta: { target: ['matchType', 'operator', 'value'] } }
}

function conflitoOutraConstraint(): unknown {
  return { code: 'P2002', meta: { target: ['email'] } }
}

describe('prismaUnidadeTrabalhoClassificacao.transacional', () => {
  beforeEach(() => {
    state.prisma.$transaction.mockReset()
    state.prisma.$transaction.mockImplementation(
      async (fn: (args: unknown) => unknown) => fn({}),
    )
  })

  it('devolve o valor do fn quando a primeira tentativa vence', async () => {
    const resultado = await prismaUnidadeTrabalhoClassificacao.transacional(async () => 'ok')

    expect(resultado).toBe('ok')
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('repete a unidade completa em deadlock/conflito de escrita e devolve o vencedor', async () => {
    let tentativas = 0

    const resultado = await prismaUnidadeTrabalhoClassificacao.transacional(async () => {
      tentativas += 1
      if (tentativas === 1) throw erroP2034()
      return 'segunda-venceu'
    })

    expect(tentativas).toBe(2)
    expect(resultado).toBe('segunda-venceu')
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(2)
  })

  it('repete a unidade completa no conflito identificado de categoria duplicada', async () => {
    let tentativas = 0

    const resultado = await prismaUnidadeTrabalhoClassificacao.transacional(async () => {
      tentativas += 1
      if (tentativas === 1) throw conflitoCategoria()
      return 'reativação-venceu'
    })

    expect(tentativas).toBe(2)
    expect(resultado).toBe('reativação-venceu')
  })

  it('lança o último conflito transatório quando o limite pequeno é excedido', async () => {
    const erro = erroP2034()

    await expect(
      prismaUnidadeTrabalhoClassificacao.transacional(async () => {
        throw erro
      }),
    ).rejects.toBe(erro)
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(3)
  })

  it('não repete conflito de domínio (item já classificado)', async () => {
    await expect(
      prismaUnidadeTrabalhoClassificacao.transacional(async () => {
        throw new ItemJaClassificadoError('item_1')
      }),
    ).rejects.toBeInstanceOf(ItemJaClassificadoError)
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('não repete conflito de domínio (item não encontrado)', async () => {
    await expect(
      prismaUnidadeTrabalhoClassificacao.transacional(async () => {
        throw new ItemNaoEncontradoError('item_1')
      }),
    ).rejects.toBeInstanceOf(ItemNaoEncontradoError)
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('não repete P2002 de outra constraint (ex.: e-mail único)', async () => {
    const erro = conflitoOutraConstraint()

    await expect(
      prismaUnidadeTrabalhoClassificacao.transacional(async () => {
        throw erro
      }),
    ).rejects.toBe(erro)
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('não repete erro genérico', async () => {
    const erro = new Error('falha de banco improbable')

    await expect(
      prismaUnidadeTrabalhoClassificacao.transacional(async () => {
        throw erro
      }),
    ).rejects.toBe(erro)
    expect(state.prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})
