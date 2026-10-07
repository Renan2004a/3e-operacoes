import { cn } from './utils'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

/** Estado vazio com texto explícito, sem depender de cor (FE-08). */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center gap-2 rounded-card border border-dashed border-line bg-surface-2 p-8 text-center',
        className,
      )}
    >
      <p className="text-base font-semibold text-ink">{title}</p>
      {description ? <p className="text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  )
}
