import { exigirAcessoPagina } from '@/shared/http/autorizacao-pagina'

/** Área do Gerente de Produção (painel, pedidos e atividades). */
export default async function GerenteLayout({ children }: { children: React.ReactNode }) {
  await exigirAcessoPagina({ perfis: ['PRODUCTION_MANAGER'] })
  return children
}
