import { exigirAcessoPagina } from '@/shared/http/autorizacao-pagina'

/** Área do Operador (fila, ocorrências e execução). O Gerente também executa. */
export default async function OperadorLayout({ children }: { children: React.ReactNode }) {
  await exigirAcessoPagina({ acoes: ['registrar_execucao', 'registrar_ocorrencia'] })
  return children
}
