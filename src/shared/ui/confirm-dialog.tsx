'use client'

import { useEffect, useId, useRef } from 'react'
import { Button } from './button'
import { cn } from './utils'

type ConfirmDialogVariant = 'default' | 'warning'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  children: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  /** `warning` destaca ações fora do normal (ex.: exceção auditada). */
  variant?: ConfirmDialogVariant
  /** Requisição em andamento: bloqueia os botões e o Esc. */
  busy?: boolean
  busyLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

const BORDA: Record<ConfirmDialogVariant, string> = {
  default: 'border-line',
  warning: 'border-warning/60',
}

/**
 * Janela de confirmação para ações irreversíveis. O foco começa em "Cancelar"
 * (opção segura), fica preso na janela e volta ao elemento de origem ao fechar.
 * Esc cancela, exceto durante o envio.
 */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancelar',
  variant = 'default',
  busy = false,
  busyLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const descriptionId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null
    cancelRef.current?.focus()
    return () => origem?.focus()
  }, [open])

  if (!open) return null

  function aoTeclar(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key === 'Escape') {
      if (!busy) onCancel()
      return
    }
    if (evento.key !== 'Tab') return
    const focaveis = Array.from(
      dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
    )
    if (focaveis.length === 0) return
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (evento.shiftKey && document.activeElement === primeiro) {
      evento.preventDefault()
      ultimo.focus()
    } else if (!evento.shiftKey && document.activeElement === ultimo) {
      evento.preventDefault()
      primeiro.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-4 sm:items-center">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        onKeyDown={aoTeclar}
        className={cn(
          'grid w-full max-w-md gap-4 rounded-card border bg-surface p-5 shadow-lg',
          BORDA[variant],
        )}
      >
        <h2 id={titleId} className="text-lg font-semibold text-ink">
          {title}
        </h2>
        <div id={descriptionId} className="grid gap-2 text-sm text-ink">
          {children}
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button ref={cancelRef} variant="outline" disabled={busy} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button disabled={busy} onClick={onConfirm}>
            {busy && busyLabel ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
