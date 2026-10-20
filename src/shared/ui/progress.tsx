import { cn } from './utils'

export type ProgressTone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral'

const PREENCHIMENTO: Record<ProgressTone, string> = {
  accent: 'bg-accent',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  neutral: 'bg-muted/40',
}

export interface ProgressProps {
  /** Percentual de 0 a 100. Valores fora da faixa são limitados. */
  value: number
  /** Rótulo acessível e visível (o estado nunca depende só da cor). */
  label: string
  helper?: string
  tone?: ProgressTone
  className?: string
}

/**
 * Barra de progresso única do produto. Usa `role="progressbar"` com valores
 * acessíveis e sempre exibe o percentual como texto, para que o estado não
 * dependa apenas da cor (WCAG 1.4.1). As cores representam o estado real:
 * `accent` em andamento, `success` concluído, `warning` atenção e `danger` falha.
 */
export function Progress({ value, label, helper, tone = 'accent', className }: ProgressProps) {
  const seguro = Math.min(100, Math.max(0, Math.round(Number.isFinite(value) ? value : 0)))

  return (
    <div className={cn('grid gap-1', className)}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-ink">{label}</span>
        <span className="font-semibold text-ink">{seguro}%</span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={seguro}
        className="h-3 w-full overflow-hidden rounded-full bg-line"
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-300', PREENCHIMENTO[tone])}
          style={{ width: `${seguro}%` }}
        />
      </div>
      {helper ? <p className="text-xs text-muted">{helper}</p> : null}
    </div>
  )
}
