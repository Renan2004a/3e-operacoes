import { describe, expect, it } from 'vitest'
import type { ItemParaClassificar } from './classificar-item'
import { ItemNaoEncontradoError, SetorInvalidoError } from './classificar-item'
import type { Sector } from './gerenciar-setores'
import {
  ItemNaoClassificadoError,
  MotivoExcedeLimiteError,
  MotivoObrigatorioError,
  RegistrosOperacionaisError,
  corrigirSetorItem,
  motivoBloqueioCorrecao,
  type AtividadeDoItem,
  type CorrecaoSetorRepository,
} from './corrigir-setor'

const NOW = new Date('2026-10-21T12:00:00.000Z')

function sector(overrides: Partial<Sector> & Pick<Sector, 'id'>): Sector {
  return {
    code: 'TELHAS',
    name: 'Telhas',
    active: true,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function atividade(overrides: Partial<AtividadeDoItem> = {}): AtividadeDoItem {
  return {
    id: 'act_1',
    itemId: 'item_1',
    sectorId: 'setor_corte',
    sectorCode: 'CORTE',
    sectorName: 'Corte e Dobra',
    status: 'PENDING',
    execucoes: 0,
    ocorrencias: 0,
    entregas: 0,
    ...overrides,
  }
}

interface Auditoria {
  atividadeId: string
  itemId: string
  userId: string
  setorAnterior: { id: string; code: string; name: string }
  setorNovo: { id: string; code: string; name: string }
  motivo: string | null
}

function createRepo(
  seed: {
    item?: ItemParaClassificar | null
    sectors?: Sector[]
    atividade?: AtividadeDoItem | null
    trocaFalha?: boolean
  } = {},
) {
  const estado = {
    item:
      seed.item === undefined
        ? ({
            id: 'item_1',
            legacyCategory: null,
            classificationStatus: 'CLASSIFIED',
          } as ItemParaClassificar)
        : seed.item,
    atividade: seed.atividade === undefined ? atividade() : seed.atividade,
    auditorias: [] as Auditoria[],
  }
  const setores = seed.sectors ?? [
    sector({ id: 'setor_telhas' }),
    sector({ id: 'setor_corte', code: 'CORTE', name: 'Corte e Dobra' }),
  ]

  const repo: CorrecaoSetorRepository = {
    async findItemById(id) {
      return estado.item && estado.item.id === id ? { ...estado.item } : null
    },
    async findSectorById(id) {
      const encontrado = setores.find((setor) => setor.id === id)
      return encontrado ? { ...encontrado } : null
    },
    async findActivityByItemId(itemId) {
      return estado.atividade && estado.atividade.itemId === itemId ? { ...estado.atividade } : null
    },
    async trocarSetorDaAtividade(input) {
      if (seed.trocaFalha || !estado.atividade) return false
      estado.atividade.sectorId = input.setorNovo.id
      estado.auditorias.push({
        atividadeId: input.atividadeId,
        itemId: input.itemId,
        userId: input.userId,
        setorAnterior: { ...input.setorAnterior },
        setorNovo: { ...input.setorNovo },
        motivo: input.motivo,
      })
      return true
    },
  }

  return { repo, estado }
}

describe('corrigirSetorItem', () => {
  it('permite ao vendedor corrigir o setor sem motivo quando não há registros operacionais', async () => {
    const { repo, estado } = createRepo()

    const resultado = await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_telhas',
        exigeMotivo: false,
        motivo: null,
        userId: 'user_vendedor',
      },
      repo,
    )

    expect(resultado).toEqual({
      status: 'CLASSIFIED',
      sectorId: 'setor_telhas',
      activityId: 'act_1',
      alterado: true,
    })
    expect(estado.atividade?.sectorId).toBe('setor_telhas')
    expect(estado.auditorias).toEqual([
      {
        atividadeId: 'act_1',
        itemId: 'item_1',
        userId: 'user_vendedor',
        setorAnterior: { id: 'setor_corte', code: 'CORTE', name: 'Corte e Dobra' },
        setorNovo: { id: 'setor_telhas', code: 'TELHAS', name: 'Telhas' },
        motivo: null,
      },
    ])
  })

  it('preserva as auditorias anteriores ao corrigir o setor de novo', async () => {
    const { repo, estado } = createRepo()

    await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_telhas',
        exigeMotivo: false,
        motivo: null,
        userId: 'user_vendedor',
      },
      repo,
    )
    await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_corte',
        exigeMotivo: true,
        motivo: 'Voltou ao setor original',
        userId: 'user_gerente',
      },
      repo,
    )

    expect(estado.auditorias).toHaveLength(2)
    expect(estado.auditorias[0]).toMatchObject({ userId: 'user_vendedor' })
    expect(estado.auditorias[1]).toMatchObject({
      userId: 'user_gerente',
      setorAnterior: { id: 'setor_telhas' },
      setorNovo: { id: 'setor_corte' },
    })
  })

  it('aceita motivo com exatamente 500 caracteres Unicode, mesmo com emoji', async () => {
    const { repo, estado } = createRepo()
    const motivo = `${'a'.repeat(499)}😀`

    await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_telhas',
        exigeMotivo: true,
        motivo,
        userId: 'user_gerente',
      },
      repo,
    )

    expect(estado.auditorias[0].motivo).toBe(motivo)
  })

  it('rejeita motivo com mais de 500 caracteres Unicode sem gravar nada', async () => {
    const { repo, estado } = createRepo()

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: true,
          motivo: 'a'.repeat(501),
          userId: 'user_gerente',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(MotivoExcedeLimiteError)
    expect(estado.atividade?.sectorId).toBe('setor_corte')
    expect(estado.auditorias).toHaveLength(0)
  })

  it('rejeita limite excedido também para o vendedor que informar motivo', async () => {
    const { repo } = createRepo()

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: 'b'.repeat(501),
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(MotivoExcedeLimiteError)
  })

  it('grava o motivo sem espaços nas bordas', async () => {
    const { repo, estado } = createRepo()

    await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_telhas',
        exigeMotivo: true,
        motivo: '  Cadastro errado  ',
        userId: 'user_gerente',
      },
      repo,
    )

    expect(estado.auditorias[0].motivo).toBe('Cadastro errado')
  })

  it('exige motivo para gerente e responsável pelo sistema e registra o motivo na auditoria', async () => {
    const { repo, estado } = createRepo()

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: true,
          motivo: '   ',
          userId: 'user_gerente',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(MotivoObrigatorioError)
    expect(estado.atividade?.sectorId).toBe('setor_corte')

    await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_telhas',
        exigeMotivo: true,
        motivo: '  Produto é telha, não corte  ',
        userId: 'user_gerente',
      },
      repo,
    )

    expect(estado.auditorias[0]).toMatchObject({
      userId: 'user_gerente',
      motivo: 'Produto é telha, não corte',
    })
  })

  it('rejeita correção de item ainda não desmembrado', async () => {
    const { repo } = createRepo({
      item: { id: 'item_1', legacyCategory: null, classificationStatus: 'PENDING_CLASSIFICATION' },
      atividade: null,
    })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(ItemNaoClassificadoError)
  })

  it('rejeita correção quando o item tem execução registrada', async () => {
    const { repo, estado } = createRepo({ atividade: atividade({ execucoes: 1 }) })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(RegistrosOperacionaisError)
    expect(estado.atividade?.sectorId).toBe('setor_corte')
    expect(estado.auditorias).toHaveLength(0)
  })

  it('rejeita correção quando o item tem ocorrência registrada', async () => {
    const { repo } = createRepo({ atividade: atividade({ ocorrencias: 1 }) })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(RegistrosOperacionaisError)
  })

  it('rejeita correção quando o item tem entrega registrada', async () => {
    const { repo } = createRepo({ atividade: atividade({ entregas: 1 }) })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: true,
          motivo: 'Erro de cadastro',
          userId: 'user_gerente',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(RegistrosOperacionaisError)
  })

  it('rejeita correção quando a atividade já saiu de PENDING', async () => {
    const { repo } = createRepo({ atividade: atividade({ status: 'IN_PROGRESS' }) })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(RegistrosOperacionaisError)
  })

  it('rejeita quando o repositório detecta registro criado entre a leitura e a gravação', async () => {
    const { repo, estado } = createRepo({ trocaFalha: true })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(RegistrosOperacionaisError)
    expect(estado.auditorias).toHaveLength(0)
  })

  it('rejeita setor inexistente ou inativo', async () => {
    const { repo } = createRepo({
      sectors: [sector({ id: 'setor_inativo', active: false })],
    })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'setor_inativo',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(SetorInvalidoError)
    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_1',
          sectorId: 'inexistente',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(SetorInvalidoError)
  })

  it('rejeita item inexistente', async () => {
    const { repo } = createRepo({ item: null })

    await expect(
      corrigirSetorItem(
        {
          itemId: 'item_x',
          sectorId: 'setor_telhas',
          exigeMotivo: false,
          motivo: null,
          userId: 'user_vendedor',
        },
        repo,
      ),
    ).rejects.toBeInstanceOf(ItemNaoEncontradoError)
  })

  it('não altera nem audita quando o setor informado já é o atual', async () => {
    const { repo, estado } = createRepo()

    const resultado = await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_corte',
        exigeMotivo: true,
        motivo: 'Confirmado',
        userId: 'user_gerente',
      },
      repo,
    )

    expect(resultado).toMatchObject({ sectorId: 'setor_corte', alterado: false })
    expect(estado.auditorias).toHaveLength(0)
  })

  it('informa ao usuário o motivo do bloqueio pelo registro operacional', async () => {
    const { repo } = createRepo({ atividade: atividade({ execucoes: 1 }) })

    const erro = await corrigirSetorItem(
      {
        itemId: 'item_1',
        sectorId: 'setor_telhas',
        exigeMotivo: false,
        motivo: null,
        userId: 'user_vendedor',
      },
      repo,
    ).catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(RegistrosOperacionaisError)
    expect((erro as RegistrosOperacionaisError).motivoBloqueio).toBe(
      'O item já possui execução registrada.',
    )
  })
})

describe('motivoBloqueioCorrecao', () => {
  const base = { status: 'PENDING' as const, execucoes: 0, ocorrencias: 0, entregas: 0 }

  it('permite a correção quando não há registros operacionais', () => {
    expect(motivoBloqueioCorrecao(base)).toBeNull()
  })

  it('bloqueia por entrega, execução, ocorrência ou atividade iniciada', () => {
    expect(motivoBloqueioCorrecao({ ...base, entregas: 1 })).toBe(
      'O item já possui entrega registrada.',
    )
    expect(motivoBloqueioCorrecao({ ...base, execucoes: 1 })).toBe(
      'O item já possui execução registrada.',
    )
    expect(motivoBloqueioCorrecao({ ...base, ocorrencias: 1 })).toBe(
      'O item já possui ocorrência registrada.',
    )
    expect(motivoBloqueioCorrecao({ ...base, status: 'PAUSED' })).toBe(
      'A produção deste item já foi iniciada.',
    )
  })

  it('bloqueia quando o item não tem atividade', () => {
    expect(motivoBloqueioCorrecao(null)).toBe('O item ainda não possui atividade de produção.')
  })
})
