import { cn } from './utils'

export interface PageHeadProps {
  title: string
  description?: string
  actions?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho de página: título, descrição e ações opcionais. Empilha no celular
 * e alinha as ações à direita a partir do tablet (VIS-07).
 */
export function PageHead({ title, description, actions, className }: PageHeadProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold text-ink">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  )
}
