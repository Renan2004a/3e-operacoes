import Link from 'next/link'
import { FileQuestion } from 'lucide-react'

/**
 * Página 404 amigável. Evita a tela padrão do Next e ajuda o usuário a voltar
 * para a área correta (o link da raiz redireciona para a tela do perfil).
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-info-bg text-info">
        <FileQuestion aria-hidden="true" className="h-7 w-7" />
      </span>
      <h1 className="text-2xl font-semibold text-ink">Página não encontrada</h1>
      <p className="max-w-md text-sm text-muted">
        O endereço acessado não existe ou foi movido. Verifique o link ou volte para o início do
        sistema.
      </p>
      <Link
        href="/"
        className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-base font-semibold text-white hover:bg-accent-dark"
      >
        Ir para o início
      </Link>
    </main>
  )
}
