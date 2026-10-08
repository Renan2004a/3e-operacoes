'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { RoleCode } from '@/generated/prisma/client'
import { cn, FOCO_VISIVEL } from './utils'
import { Button } from './button'
import { NAV_POR_PERFIL } from './navegacao-perfil'

const ROTULO_PERFIL: Record<RoleCode, string> = {
  OPERATOR: 'Operador',
  PRODUCTION_MANAGER: 'Gerente de Produção',
  SELLER: 'Vendedor',
  SHIPPING: 'Expedição',
  SYSTEM_RESPONSIBLE: 'Responsável pelo Sistema',
  TECHNICAL_RESPONSIBLE: 'Responsável Técnico',
}

export interface AppShellProps {
  perfil: RoleCode
  usuarioNome?: string
  onLogout?: () => void
  children: React.ReactNode
}

/**
 * Shell responsivo: topbar fixo com marca, usuário e sair, e navegação lateral
 * do perfil no padrão do protótipo. Em ≥ 768 px a lateral fica visível; no
 * celular vira menu acessível acionado pelo topbar (VIS-01, VIS-02). O link da
 * rota atual fica marcado. O contêiner raiz evita rolagem horizontal (VIS-03).
 */
export function AppShell({ perfil, usuarioNome, onLogout, children }: AppShellProps) {
  const [menuAberto, setMenuAberto] = useState(false)
  const [saindo, setSaindo] = useState(false)
  const caminho = usePathname()
  const router = useRouter()
  const itens = NAV_POR_PERFIL[perfil]
  const rotuloPerfil = ROTULO_PERFIL[perfil]

  /** Encerra a sessão e volta ao login (usa `onLogout` quando fornecido). */
  async function sair() {
    if (onLogout) {
      onLogout()
      return
    }
    setSaindo(true)
    try {
      await fetch('/api/auth/sessao', { method: 'DELETE' })
    } catch {
      // segue para o login mesmo se a chamada falhar
    } finally {
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-bg">
      <header className="sticky top-0 z-20 flex min-h-[68px] items-center justify-between gap-3 border-b border-line bg-surface px-4 sm:px-6 print:hidden">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="grid h-10 w-10 place-items-center rounded-lg bg-accent font-extrabold text-white"
          >
            3E
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-semibold text-ink">3E Operações</span>
            <span className="hidden text-xs text-muted sm:block">{rotuloPerfil}</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          {usuarioNome ? (
            <span className="hidden text-sm text-muted sm:inline">{usuarioNome}</span>
          ) : null}
          <Button variant="outline" size="sm" onClick={sair} disabled={saindo}>
            {saindo ? 'Saindo…' : 'Sair'}
          </Button>
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
            'border-b border-line bg-brand-900 p-3 md:w-60 md:shrink-0 md:border-b-0 md:border-r md:border-brand-800 print:hidden',
            menuAberto ? 'block' : 'hidden md:block',
          )}
        >
          <p className="hidden px-3 py-2 text-xs font-semibold uppercase tracking-wide text-white/70 md:block">
            {rotuloPerfil}
          </p>
          <div className="grid gap-1">
            {itens.length === 0 ? (
              <p className="px-2 py-1 text-sm text-white/80">
                Sem telas disponíveis para o seu perfil.
              </p>
            ) : (
              itens.map((item) => {
                const ativo = caminho === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={ativo ? 'page' : undefined}
                    className={cn(
                      'inline-flex min-h-11 items-center rounded-lg px-3 font-medium',
                      ativo ? 'bg-brand-700 text-white' : 'text-white hover:bg-brand-700',
                      FOCO_VISIVEL,
                    )}
                    onClick={() => setMenuAberto(false)}
                  >
                    {item.label}
                  </Link>
                )
              })
            )}
          </div>
        </nav>

        <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
