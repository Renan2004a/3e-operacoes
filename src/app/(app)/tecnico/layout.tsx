import { exigirAcessoPagina } from '@/shared/http/autorizacao-pagina'

/** Monitoramento técnico da integração. */
export default async function TecnicoLayout({ children }: { children: React.ReactNode }) {
  await exigirAcessoPagina({ acoes: ['monitorar_integracao'] })
  return children
}
