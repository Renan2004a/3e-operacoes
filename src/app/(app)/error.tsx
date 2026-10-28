'use client'

import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/ui/button'

/**
 * Fronteira de erro das telas autenticadas: mantém o shell e oferece uma saída
 * clara em vez da tela padrão do Next. O detalhe técnico não aparece para o
 * usuário; ele fica no console do servidor/cliente para diagnóstico.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-start gap-4 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-lg bg-warning-bg text-warning">
          <AlertTriangle aria-hidden="true" className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-xl font-semibold text-ink">Não foi possível carregar esta tela</h1>
          <p className="text-sm text-muted">
            A página encontrou um erro inesperado. Seus dados não foram alterados.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 text-base font-semibold text-ink hover:bg-surface-2"
        >
          Ir para o início
        </Link>
      </div>

      {error.digest ? (
        <p className="text-xs text-muted">
          Se o problema continuar, informe o código <code>{error.digest}</code> ao responsável
          pelo sistema.
        </p>
      ) : null}
    </div>
  )
}
