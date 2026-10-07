import { cn } from './utils'

export interface SpinnerProps {
  label?: string
  className?: string
}

/** Indicador de carregamento anunciado a leitores de tela (FE-08). */
export function Spinner({ label = 'Carregando…', className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn('inline-flex items-center gap-2 text-muted', className)}
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-accent"
      />
      <span>{label}</span>
    </span>
  )
}
