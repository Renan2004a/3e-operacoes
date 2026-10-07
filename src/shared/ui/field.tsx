import { useId } from 'react'
import { cn } from './utils'

export interface FieldRenderProps {
  id: string
  invalid: boolean
  'aria-describedby': string | undefined
}

export interface FieldProps {
  label: string
  children: (props: FieldRenderProps) => React.ReactNode
  hint?: string
  error?: string
  required?: boolean
  className?: string
}

/**
 * Campo com rótulo associado ao controle, dica e mensagem de erro ligadas por
 * `aria-describedby` (FE-03). O erro é anunciado com `role="alert"`.
 */
export function Field({
  label,
  children,
  hint,
  error,
  required = false,
  className,
}: FieldProps) {
  const id = useId()
  const hintId = `${id}-hint`
  const errorId = `${id}-error`
  const describedBy =
    [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined

  return (
    <div className={cn('grid gap-1.5', className)}>
      <div className="flex items-center gap-1">
        <label htmlFor={id} className="text-sm font-semibold text-ink">
          {label}
        </label>
        {required ? (
          <span aria-hidden="true" className="text-danger">
            *
          </span>
        ) : null}
      </div>
      {children({ id, invalid: Boolean(error), 'aria-describedby': describedBy })}
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
