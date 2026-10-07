// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...props
  }: { href: string; children: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

import { AppShell } from './app-shell'

afterEach(cleanup)

const conteudo = <p>Conteúdo da página</p>

describe('AppShell', () => {
  it('mostra a navegação do perfil OPERATOR (FE-04)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('link', { name: 'Fila' })).toHaveAttribute('href', '/operador/fila')
  })

  it('não mostra telas de operador para outro perfil (FE-04)', () => {
    render(<AppShell perfil="SELLER">{conteudo}</AppShell>)

    expect(screen.queryByRole('link', { name: 'Fila' })).not.toBeInTheDocument()
  })

  it('renderiza o conteúdo da página no main (FE-04)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('main')).toHaveTextContent('Conteúdo da página')
  })

  it('menu mobile começa fechado e o botão o abre (FE-05)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    const abrir = screen.getByRole('button', { name: 'Abrir menu' })
    expect(abrir).toHaveAttribute('aria-expanded', 'false')
    const nav = document.getElementById(abrir.getAttribute('aria-controls') ?? '')
    expect(nav).toHaveClass('hidden')

    fireEvent.click(abrir)

    const fechar = screen.getByRole('button', { name: 'Fechar menu' })
    expect(fechar).toHaveAttribute('aria-expanded', 'true')
    expect(document.getElementById('nav-principal')).not.toHaveClass('hidden')
  })

  it('a navegação tem rótulo acessível (FE-05)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument()
  })

  it('usa overflow-x-hidden no contêiner raiz para evitar rolagem horizontal (FE-06)', () => {
    const { container } = render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(container.firstElementChild).toHaveClass('overflow-x-hidden')
  })

  it('aciona o logout quando o botão é clicado (FE-04)', () => {
    const onLogout = vi.fn()
    render(
      <AppShell perfil="OPERATOR" usuarioNome="Ana" onLogout={onLogout}>
        {conteudo}
      </AppShell>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })
})
