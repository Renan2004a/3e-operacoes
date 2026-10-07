'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { RoleCode } from '@/generated/prisma/client'
import { cn, FOCO_VISIVEL } from './utils'
import { Button } from './button'
import { NAV_POR_PERFIL } from './navegacao-perfil'

export interface AppShellProps {
  perfil: RoleCode
  usuarioNome?: string
  onLogout?: () => void
  children: React.ReactNode
}

/**
 * Shell responsivo: cabeçalho fixo, navegação do perfil e menu acessível no
 * celular (FEP-10, FE-05). O contêiner raiz evita rolagem horizontal (FE-06).
 */
export function AppShell({ perfil, usuarioNome, onLogout, children }: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const itens = NAV_POR_PERFIL[perfil]

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-bg">
      <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="grid h-9 w-9 place-items-center rounded-lg bg-accent font-extrabold text-white"
          >
            3E
          </span>
          <span className="font-semibold text-ink">3E Operações</span>
        </div>

        <div className="flex items-center gap-2">
          {usuarioNome ? (
            <span className="hidden text-sm text-muted sm:inline">{usuarioNome}</span>
          ) : null}
          {onLogout ? (
            <Button variant="outline" size="sm" onClick={onLogout}>
              Sair
            </Button>
          ) : null}
          <button
            type="button"
            className={cn(
              'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-ink md:hidden',
              FOCO_VISIVEL,
            )}
            aria-expanded={menuAberto}
            aria-controls="nav-principal"
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            onClick={() => setMenuAberto((aberto) => !aberto)}
          >
            <span aria-hidden="true">☰</span>
          </button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col md:flex-row">
        <nav
          id="nav-principal"
          aria-label="Navegação principal"
          className={cn(
            'flex-wrap gap-1 border-b border-line bg-surface p-3 md:flex md:w-56 md:flex-col md:border-b-0 md:border-r',
            menuAberto ? 'flex' : 'hidden md:flex',
          )}
        >
          {itens.length === 0 ? (
            <p className="px-2 py-1 text-sm text-muted">
              Sem telas disponíveis para o seu perfil.
            </p>
          ) : (
            itens.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex min-h-11 items-center rounded-lg px-3 font-medium text-ink hover:bg-surface-2',
                  FOCO_VISIVEL,
                )}
                onClick={() => setMenuAberto(false)}
              >
                {item.label}
              </Link>
            ))
          )}
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
