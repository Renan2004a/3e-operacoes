import { cn } from './utils'

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

const VARIANT: Record<BadgeVariant, string> = {
  neutral: 'bg-line/60 text-ink',
  success: 'bg-success-bg text-success',
  warning: 'bg-warning-bg text-warning',
  danger: 'bg-danger-bg text-danger',
  info: 'bg-info-bg text-info',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

/**
 * Rótulo de estado. Sempre acompanha texto, para o estado não depender apenas
 * de cor (FE-06).
 */
export function Badge({ variant = 'neutral', className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
