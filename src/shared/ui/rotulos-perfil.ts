import type { RoleCode } from '@/generated/prisma/client'

/** Rótulos humanos dos perfis, reutilizados pelo shell e pelo painel. */
export const ROTULO_PERFIL: Record<RoleCode, string> = {
  OPERATOR: 'Operador',
  PRODUCTION_MANAGER: 'Gerente de Produção',
  SELLER: 'Vendedor',
  SHIPPING: 'Expedição',
  SYSTEM_RESPONSIBLE: 'Responsável pelo Sistema',
  TECHNICAL_RESPONSIBLE: 'Responsável Técnico',
}
