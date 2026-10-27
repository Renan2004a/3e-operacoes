import type { RoleCode } from '@/generated/prisma/client'

export interface ItemNav {
  href: string
  label: string
}

/**
 * Navegação por perfil (FEP-10). Fonte única do mapa perfil→rotas: o shell
 * renderiza os itens e o pós-login usa a primeira rota como tela inicial do
 * perfil (FEP-11).
 */
export const NAV_POR_PERFIL: Record<RoleCode, readonly ItemNav[]> = {
  OPERATOR: [
    { href: '/operador/fila', label: 'Pedidos' },
    { href: '/operador/ocorrencias', label: 'Ocorrências' },
  ],
  PRODUCTION_MANAGER: [
    { href: '/gerente/painel', label: 'Painel' },
    { href: '/gerente/pedidos', label: 'Pedidos' },
    { href: '/integracao', label: 'Importar pedido' },
    // A matriz concede `registrar_execucao` ao gerente, então ele acessa a fila
    // de produção compartilhada com o operador (QF-10). Fica por último para
    // preservar o painel como tela inicial (FEP-11).
    { href: '/operador/fila', label: 'Fila de produção' },
  ],
  SELLER: [{ href: '/vendedor/pedidos', label: 'Vendas' }],
  SHIPPING: [{ href: '/expedicao/entregas', label: 'Entregas' }],
  SYSTEM_RESPONSIBLE: [
    { href: '/admin/usuarios', label: 'Usuários' },
    { href: '/admin/setores', label: 'Setores' },
    { href: '/integracao', label: 'Importar pedido' },
  ],
  TECHNICAL_RESPONSIBLE: [
    { href: '/tecnico/integracao', label: 'Integração' },
    { href: '/integracao', label: 'Importar pedido' },
  ],
}

/**
 * Tela inicial do perfil: a primeira rota do seu escopo (FEP-11). Perfil sem
 * telas entregues cai na página inicial neutra.
 */
export function rotaInicialDoPerfil(perfil: RoleCode): string {
  return NAV_POR_PERFIL[perfil][0]?.href ?? '/'
}
