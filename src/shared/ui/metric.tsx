import { cn } from './utils'

type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

const TONE: Record<MetricTone, string> = {
  default: 'text-ink',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
}

export interface MetricProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  value: React.ReactNode
  helper?: string
  tone?: MetricTone
}

/**
 * Card de métrica do painel: rótulo, valor em destaque e texto auxiliar
 * opcional. O valor sempre aparece como texto, então o estado não depende de
 * cor (FE-06, VIS-07).
 */
export function Metric({ label, value, helper, tone = 'default', className, ...props }: MetricProps) {
  return (
    <div
      className={cn('rounded-card border border-line bg-surface p-5 shadow-sm', className)}
      {...props}
    >
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className={cn('mt-1 text-3xl font-bold', TONE[tone])}>{value}</p>
      {helper ? <p className="mt-1 text-sm text-muted">{helper}</p> : null}
    </div>
  )
}
