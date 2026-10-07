import { forwardRef } from 'react'
import { cn } from './utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

/** Campo de texto com altura de toque confortável e estado de erro anunciado (FE-03). */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid = false, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'min-h-11 w-full rounded-lg border border-line bg-surface px-3 py-2 text-base text-ink',
        'placeholder:text-muted',
        'focus-visible:border-accent',
        invalid && 'border-danger',
        className,
      )}
      {...props}
    />
  )
})
