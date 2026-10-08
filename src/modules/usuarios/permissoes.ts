import type { RoleCode } from '@/generated/prisma/client'

export const TODOS_PERFIS: readonly RoleCode[] = [
  'OPERATOR',
  'PRODUCTION_MANAGER',
  'SELLER',
  'SHIPPING',
  'SYSTEM_RESPONSIBLE',
  'TECHNICAL_RESPONSIBLE',
]

export type Acao =
  | 'consultar_pedidos'
  | 'registrar_execucao'
  | 'registrar_ocorrencia'
  | 'definir_prioridade'
  | 'registrar_entrega'
  | 'autorizar_excecao'
  | 'classificar_item'
  | 'solicitar_importacao'
  | 'gerenciar_usuarios'
  | 'gerenciar_setores'
  | 'monitorar_integracao'
  | 'definir_prazo'

/** Matriz ação × perfis permitidos (design.md). Fonte única da autorização no servidor. */
const MATRIZ: Record<Acao, readonly RoleCode[]> = {
  consultar_pedidos: TODOS_PERFIS,
  registrar_execucao: ['OPERATOR', 'PRODUCTION_MANAGER'],
  registrar_ocorrencia: ['OPERATOR', 'PRODUCTION_MANAGER'],
  definir_prioridade: ['PRODUCTION_MANAGER'],
  registrar_entrega: ['SHIPPING', 'PRODUCTION_MANAGER'],
  autorizar_excecao: ['PRODUCTION_MANAGER'],
  classificar_item: ['PRODUCTION_MANAGER', 'SYSTEM_RESPONSIBLE', 'SELLER'],
  solicitar_importacao: ['PRODUCTION_MANAGER', 'TECHNICAL_RESPONSIBLE', 'SYSTEM_RESPONSIBLE'],
  gerenciar_usuarios: ['SYSTEM_RESPONSIBLE'],
  gerenciar_setores: ['SYSTEM_RESPONSIBLE'],
  monitorar_integracao: ['TECHNICAL_RESPONSIBLE', 'SYSTEM_RESPONSIBLE'],
  definir_prazo: ['PRODUCTION_MANAGER', 'SELLER'],
}

/**
 * Indica se algum dos perfis do usuário pode executar a ação (AUTH-08, AUTH-09).
 * Ação desconhecida ou usuário sem perfil é negado por padrão.
 */
export function pode(perfis: readonly RoleCode[], acao: string): boolean {
  const permitidos = MATRIZ[acao as Acao]
  if (!permitidos) return false
  return perfis.some((perfil) => permitidos.includes(perfil))
}
