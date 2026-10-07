import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Foco visível no próprio componente (WCAG 2.4.7), complementando o
 * `:focus-visible` global de `globals.css` para não depender só dele (QF-04).
 */
export const FOCO_VISIVEL =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2'
