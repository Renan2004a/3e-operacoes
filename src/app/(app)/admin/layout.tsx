import { exigirAcessoPagina } from '@/shared/http/autorizacao-pagina'

/** Administração: usuários e setores (Responsável pelo Sistema). */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await exigirAcessoPagina({ acoes: ['gerenciar_usuarios', 'gerenciar_setores'] })
  return children
}
