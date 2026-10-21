import { describe, expect, it } from 'vitest'
import type { ItemParaClassificar } from './classificar-item'
import { ItemNaoEncontradoError, SetorInvalidoError } from './classificar-item'
import type { Sector } from './gerenciar-setores'
import {
  ItemNaoClassificadoError,
  MotivoObrigatorioError,
  RegistrosOperacionaisError,
  corrigirSetorItem,
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
    status: 'PENDING',
    execucoes: 0,
    ocorrencias: 0,
    entregas: 0,
    ...overrides,
  }
}

interface Auditoria {
  userId: string
  setorAnteriorId: string
  sectorId: string
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
      estado.atividade.sectorId = input.sectorId
      estado.auditorias.push({
        userId: input.userId,
        setorAnteriorId: input.setorAnteriorId,
        sectorId: input.sectorId,
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
        userId: 'user_vendedor',
        setorAnteriorId: 'setor_corte',
        sectorId: 'setor_telhas',
        motivo: null,
      },
    ])
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
})
