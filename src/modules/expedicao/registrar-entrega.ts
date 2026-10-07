import { validarQuantidade, type Quantidade } from '../producao/unidades'
import { calcularDisponivel } from './disponibilidade'

/** Papéis de usuário (espelha `RoleCode` do schema, sem acoplar o domínio ao Prisma). */
export type PapelUsuario =
  | 'OPERATOR'
  | 'PRODUCTION_MANAGER'
  | 'SELLER'
  | 'SHIPPING'
  | 'SYSTEM_RESPONSIBLE'
  | 'TECHNICAL_RESPONSIBLE'

/** Status derivado do item: parcial enquanto entregue < executado; concluído ao alcançar (RN004). */
export type StatusEntrega = 'PARCIAL' | 'CONCLUIDO'

/** Papéis que podem registrar entrega (RF010, docs/perfis-permissoes.md). */
export const PAPEIS_QUE_ENTREGAM: readonly PapelUsuario[] = ['SHIPPING', 'PRODUCTION_MANAGER']

export interface ItemParaEntrega {
  id: string
  unidade: string
  /** Soma das quantidades conformes/separadas do item. */
  executado: Quantidade
  /** Soma das quantidades já entregues do item. */
  entregue: Quantidade
}

export interface Entrega {
  id: string
  orderItemId: string
  userId: string
  quantidade: Quantidade
  managerOverride: boolean
  overrideReason: string | null
  authorizedByUserId: string | null
  availableBefore: Quantidade | null
  occurredAt: Date
}

/** Dados de auditoria de uma exceção gerencial (RN005, docs/perfis-permissoes.md). */
export interface AuditoriaExcecao {
  /** Disponível antes da entrega. */
  disponivelAntes: Quantidade
  /** Quantidade solicitada na entrega. */
  quantidade: Quantidade
  /** Gerente que autorizou. */
  gerenteId: string
  /** Data/hora da operação. */
  occurredAt: Date
}

export interface RegistrarEntregaPortInput {
  itemId: string
  usuarioId: string
  quantidade: Quantidade
  managerOverride: boolean
  overrideReason: string | null
  authorizedByUserId: string | null
  availableBefore: Quantidade
  /** Presente apenas na exceção; o adapter grava o `AuditLog` na mesma transação. */
  auditoria: AuditoriaExcecao | null
  occurredAt: Date
  /** Decide o status a partir da soma das entregas calculada dentro da transação. */
  resolverStatus: (entregueTotal: Quantidade) => StatusEntrega
}

export interface RegistrarEntregaPortResult {
  entrega: Entrega
  /** Soma das entregas do item após a inserção, na mesma transação. */
  entregueTotal: Quantidade
  status: StatusEntrega
}

export interface ExpedicaoRepository {
  /** Item com unidade, executado e entregue, ou null se não existir. */
  buscarItemParaEntrega(itemId: string): Promise<ItemParaEntrega | null>
  /** Papéis cadastrados do usuário (RF014). */
  papeisDoUsuario(usuarioId: string): Promise<PapelUsuario[]>
  /** Insere a entrega (e a auditoria da exceção) na mesma transação. */
  registrarEntrega(input: RegistrarEntregaPortInput): Promise<RegistrarEntregaPortResult>
}

export class ItemNaoEncontradoError extends Error {
  constructor(itemId: string) {
    super(`Item não encontrado: ${itemId}`)
    this.name = 'ItemNaoEncontradoError'
  }
}

export class PapelSemPermissaoError extends Error {
  constructor(usuarioId: string) {
    super(`Usuário ${usuarioId} não pode registrar entrega`)
    this.name = 'PapelSemPermissaoError'
  }
}

export class EntregaAcimaDoDisponivelError extends Error {
  constructor(itemId: string, quantidade: Quantidade, disponivel: Quantidade) {
    super(
      `Entrega de ${quantidade.toString()} acima do disponível ${disponivel.toString()} do item ${itemId}`,
    )
    this.name = 'EntregaAcimaDoDisponivelError'
  }
}

export class MotivoExcecaoObrigatorioError extends Error {
  constructor(itemId: string) {
    super(`Motivo é obrigatório para a exceção de entrega do item ${itemId}`)
    this.name = 'MotivoExcecaoObrigatorioError'
  }
}

export function podeRegistrarEntrega(papeis: PapelUsuario[]): boolean {
  return papeis.some((papel) => PAPEIS_QUE_ENTREGAM.includes(papel))
}

/** Entrega que alcança o executado conclui o item; abaixo disso permanece parcial (RN004, EXP-08,09). */
export function resolverStatusEntrega(
  executado: Quantidade,
  entregueTotal: Quantidade,
): StatusEntrega {
  return entregueTotal.gte(executado) ? 'CONCLUIDO' : 'PARCIAL'
}

export interface RegistrarEntregaInput {
  itemId: string
  usuarioId: string
  quantidade: Quantidade | string | number
  excecao?: boolean
  motivoExcecao?: string | null
  occurredAt?: Date
}

export interface RegistrarEntregaResult {
  entrega: Entrega
  status: StatusEntrega
}

/**
 * Registra a entrega total ou parcial do item (EXP-03..09,13). Restrita à
 * Expedição e ao Gerente; acima do disponível é bloqueada, exceto com exceção
 * do gerente, com motivo obrigatório e auditoria completa (RN005).
 */
export async function registrarEntrega(
  input: RegistrarEntregaInput,
  repo: ExpedicaoRepository,
): Promise<RegistrarEntregaResult> {
  const item = await repo.buscarItemParaEntrega(input.itemId)
  if (!item) throw new ItemNaoEncontradoError(input.itemId)

  const papeis = await repo.papeisDoUsuario(input.usuarioId)
  if (!podeRegistrarEntrega(papeis)) throw new PapelSemPermissaoError(input.usuarioId)

  const quantidade = validarQuantidade(item.unidade, input.quantidade)
  const disponivelAntes = calcularDisponivel({
    executado: item.executado,
    entregue: item.entregue,
  })
  const occurredAt = input.occurredAt ?? new Date()

  const excecao = input.excecao === true
  const motivo = input.motivoExcecao?.trim() ?? ''
  if (excecao) {
    if (!papeis.includes('PRODUCTION_MANAGER')) throw new PapelSemPermissaoError(input.usuarioId)
    if (motivo === '') throw new MotivoExcecaoObrigatorioError(input.itemId)
  }

  if (quantidade.gt(disponivelAntes) && !excecao) {
    throw new EntregaAcimaDoDisponivelError(input.itemId, quantidade, disponivelAntes)
  }

  const auditoria: AuditoriaExcecao | null = excecao
    ? { disponivelAntes, quantidade, gerenteId: input.usuarioId, occurredAt }
    : null

  const { entrega, status } = await repo.registrarEntrega({
    itemId: input.itemId,
    usuarioId: input.usuarioId,
    quantidade,
    managerOverride: excecao,
    overrideReason: excecao ? motivo : null,
    authorizedByUserId: excecao ? input.usuarioId : null,
    availableBefore: disponivelAntes,
    auditoria,
    occurredAt,
    resolverStatus: (entregueTotal) => resolverStatusEntrega(item.executado, entregueTotal),
  })

  return { entrega, status }
}
