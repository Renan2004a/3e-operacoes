'use client'

import { Button } from '@/shared/ui/button'

/**
 * Fronteira de erro da raiz (fora do shell): usada quando o layout raiz falha.
 * Mantém a identidade visual e permite recarregar sem perder o usuário na tela
 * padrão do Next.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt-BR">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f4f7f9',
          color: '#17212b',
          fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
        }}
      >
        <main
          style={{
            maxWidth: 520,
            padding: 24,
            background: '#ffffff',
            border: '1px solid #dce4e8',
            borderRadius: 12,
            boxShadow: '0 1px 2px rgba(16, 42, 51, .06)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span
              aria-hidden="true"
              style={{
                display: 'grid',
                placeItems: 'center',
                width: 44,
                height: 44,
                borderRadius: 8,
                background: '#fff5dd',
                color: '#7a4e00',
                fontWeight: 700,
              }}
            >
              !
            </span>
            <div>
              <h1 style={{ margin: 0, fontSize: 20 }}>3E Operações indisponível</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#4b5b66' }}>
                Ocorreu um erro inesperado ao abrir o sistema.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <Button onClick={reset}>Tentar novamente</Button>
            <a
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 44,
                padding: '0 16px',
                borderRadius: 8,
                border: '1px solid #dce4e8',
                background: '#ffffff',
                color: '#17212b',
                fontWeight: 600,
                textDecoration: 'none',
                fontSize: 16,
              }}
            >
              Ir para o login
            </a>
          </div>

          {error.digest ? (
            <p style={{ marginTop: 16, fontSize: 12, color: '#4b5b66' }}>
              Código do erro: <code>{error.digest}</code>
            </p>
          ) : null}
        </main>
      </body>
    </html>
  )
}
