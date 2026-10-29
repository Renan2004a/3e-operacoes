import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { Sector } from '../gerenciar-setores'
import {
  ItemJaClassificadoError,
  ItemNaoEncontradoError,
  type ActivityCriada,
  type ClassificacaoEmTransacao,
  type ClassificacaoRepository,
  type ItemParaClassificar,
} from '../classificar-item'

/**
 * Identifica a violação da chave única `(orderItemId, sectorId)` de `Activity`.
 * Só traduz a constraint conhecida; outros `P2002` continuam propagando.
 */
function ehViolacaoDaAtividadeUnica(erro: unknown): boolean {
  if (typeof erro !== 'object' || erro === null) return false
  const { code, meta } = erro as { code?: unknown; meta?: { target?: unknown } }
  if (code !== 'P2002') return false

  const target = meta?.target
  if (Array.isArray(target)) {
    return target.includes('orderItemId') && target.includes('sectorId')
  }
  if (typeof target === 'string') {
    return target.includes('orderItemId') && target.includes('sectorId')
  }
  return false
}

/**
 * Transição condicional do item pendente para `CLASSIFIED`, executada no
 * cliente recebido (global ou transacional). Árbitro de concorrência: só vence
 * quem ainda encontra o item pendente; a consulta do estado atual somente para
 * distinguir ausência (`404`) de conflito (`409`). Assumir que reler resolve
 * dentro da mesma transação não vale para criações de outra transação; aqui a
 * leitura é apenas do próprio item, cujo `updateMany` já travou a linha.
 */
export async function transicionarPendenteNoEscopo(
  cliente: Prisma.TransactionClient,
  itemId: string,
): Promise<void> {
  const { count } = await cliente.orderItem.updateMany({
    where: { id: itemId, classificationStatus: 'PENDING_CLASSIFICATION' },
    data: { classificationStatus: 'CLASSIFIED' },
  })
  if (count > 0) return

  const existe = await cliente.orderItem.findUnique({ where: { id: itemId }, select: { id: true } })
  if (!existe) throw new ItemNaoEncontradoError(itemId)
  throw new ItemJaClassificadoError(itemId)
}

/**
 * Criação da atividade no cliente recebido, com a defesa para dados legados:
 * um item já com atividade (mesmo de outro setor) não ganha uma segunda, e a
 * corrida residual fora do fluxo da aplicação ainda é coberta pela constraint
 * única de atividade.
 */
export async function criarAtividadeNoEscopo(
  cliente: Prisma.TransactionClient,
  itemId: string,
  sectorId: string,
): Promise<ActivityCriada> {
  const atividadeExistente = await cliente.activity.findFirst({
    where: { orderItemId: itemId },
    select: { id: true },
  })
  if (atividadeExistente) throw new ItemJaClassificadoError(itemId)

  try {
    const activity = await cliente.activity.create({ data: { orderItemId: itemId, sectorId } })
    return { id: activity.id, orderItemId: activity.orderItemId, sectorId: activity.sectorId }
  } catch (erro) {
    // Corrida residual fora do fluxo da aplicação: a constraint de atividade
    // única ainda protege contra duplicação e vira conflito de domínio.
    if (ehViolacaoDaAtividadeUnica(erro)) throw new ItemJaClassificadoError(itemId)
    throw erro
  }
}

async function lerItemNoEscopo(
  cliente: Prisma.TransactionClient,
  itemId: string,
): Promise<ItemParaClassificar | null> {
  const row = await cliente.orderItem.findUnique({ where: { id: itemId } })
  if (!row) return null
  return {
    id: row.id,
    legacyCategory: row.legacyCategory,
    classificationStatus: row.classificationStatus,
  }
}

async function lerSetorNoEscopo(
  cliente: Prisma.TransactionClient,
  sectorId: string,
): Promise<Sector | null> {
  const row = await cliente.sector.findUnique({ where: { id: sectorId } })
  if (!row) return null
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    active: row.active,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Implementação Prisma da porta `ClassificacaoEmTransacao`: todos os métodos
 * usam o cliente transacional recebido e NÃO abrem transação própria.
 */
export function criarClassificacaoEmTransacao(
  cliente: Prisma.TransactionClient,
): ClassificacaoEmTransacao {
  return {
    transicionarPendente: (itemId) => transicionarPendenteNoEscopo(cliente, itemId),
    findItemById: (itemId) => lerItemNoEscopo(cliente, itemId),
    findSectorById: (sectorId) => lerSetorNoEscopo(cliente, sectorId),
    criarAtividade: (itemId, sectorId) => criarAtividadeNoEscopo(cliente, itemId, sectorId),
  }
}

/** Implementação Prisma da porta `ClassificacaoRepository` (fluxo automático). */
export const prismaClassificacaoRepository: ClassificacaoRepository = {
  findItemById: (itemId) => lerItemNoEscopo(prisma, itemId),

  findSectorById: (sectorId) => lerSetorNoEscopo(prisma, sectorId),

  async markClassified({ itemId, sectorId }): Promise<ActivityCriada> {
    try {
      // A transição é o árbitro da concorrência: só vence quem ainda encontra
      // o item pendente. A atualização condicional e a criação da atividade
      // ficam na mesma transação; qualquer falha desfaz a classificação.
      return await prisma.$transaction(async (tx) => {
        await transicionarPendenteNoEscopo(tx, itemId)
        return criarAtividadeNoEscopo(tx, itemId, sectorId)
      })
    } catch (erro) {
      // Erros de domínio são contratos da API; a violação residual da
      // constraint de atividade única ainda é traduzida em conflito e o
      // restante propaga para a unidade transacional.
      if (erro instanceof ItemJaClassificadoError || erro instanceof ItemNaoEncontradoError) {
        throw erro
      }
      // Corrida residual fora do fluxo da aplicação: a constraint de atividade
      // única ainda protege contra duplicação e vira conflito de domínio.
      if (ehViolacaoDaAtividadeUnica(erro)) throw new ItemJaClassificadoError(itemId)
      throw erro
    }
  },
}
