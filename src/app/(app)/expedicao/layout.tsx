import { exigirAcessoPagina } from '@/shared/http/autorizacao-pagina'

/** Área de Entregas: Expedição e Gerente de Produção. */
export default async function ExpedicaoLayout({ children }: { children: React.ReactNode }) {
  await exigirAcessoPagina({ acoes: ['registrar_entrega'] })
  return children
}
