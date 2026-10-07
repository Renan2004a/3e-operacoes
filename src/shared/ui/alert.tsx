import { cn } from './utils'

type AlertVariant = 'info' | 'success' | 'warning' | 'error'

const VARIANT: Record<AlertVariant, string> = {
  info: 'border-info/30 bg-info-bg text-info',
  success: 'border-success/30 bg-success-bg text-success',
  warning: 'border-warning/30 bg-warning-bg text-warning',
  error: 'border-danger/30 bg-danger-bg text-danger',
}

export interface AlertProps {
  variant?: AlertVariant
  title?: string
  children?: React.ReactNode
  action?: React.ReactNode
  className?: string
}

/**
 * Mensagem de feedback. Erros usam `role="alert"` para serem anunciados; os
 * demais usam `role="status"` (FE-14). O texto acompanha a cor.
 */
export function Alert({ variant = 'info', title, children, action, className }: AlertProps) {
  const role = variant === 'error' ? 'alert' : 'status'
  return (
    <div
      role={role}
      className={cn(
        'flex flex-col gap-2 rounded-lg border p-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        VARIANT[variant],
        className,
      )}
    >
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
