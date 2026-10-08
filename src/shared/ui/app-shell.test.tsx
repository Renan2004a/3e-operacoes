// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { RoleCode } from '@/generated/prisma/client'

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

const navegacao = vi.hoisted(() => ({
  usePathname: vi.fn(() => '/operador/fila'),
  push: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: navegacao.usePathname,
  useRouter: () => ({ push: navegacao.push, refresh: navegacao.refresh }),
}))

import { AppShell } from './app-shell'

afterEach(cleanup)

const conteudo = <p>Conteúdo da página</p>

/** Rotas esperadas por perfil (FEP-10). Fonte: design.md. */
const PERFIS: Array<{ perfil: RoleCode; itens: Array<{ nome: string; href: string }> }> = [
  { perfil: 'OPERATOR', itens: [{ nome: 'Fila', href: '/operador/fila' }] },
  {
    perfil: 'PRODUCTION_MANAGER',
    itens: [
      { nome: 'Painel', href: '/gerente/painel' },
      { nome: 'Pedidos', href: '/gerente/pedidos' },
      { nome: 'Fila', href: '/operador/fila' },
    ],
  },
  { perfil: 'SELLER', itens: [{ nome: 'Pedidos', href: '/vendedor/pedidos' }] },
  { perfil: 'SHIPPING', itens: [{ nome: 'Entregas', href: '/expedicao/entregas' }] },
  {
    perfil: 'SYSTEM_RESPONSIBLE',
    itens: [
      { nome: 'Usuários', href: '/admin/usuarios' },
      { nome: 'Setores', href: '/admin/setores' },
    ],
  },
  { perfil: 'TECHNICAL_RESPONSIBLE', itens: [] },
]

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

  it('expõe foco visível nos links de navegação (QF-04)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('link', { name: 'Fila' })).toHaveClass('focus-visible:ring-2')
  })

  it('expõe foco visível no botão do menu mobile (QF-04)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveClass('focus-visible:ring-2')
  })

  it('marca o link da rota atual como ativo (VIS-01)', () => {
    navegacao.usePathname.mockReturnValue('/operador/fila')
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('link', { name: 'Fila' })).toHaveAttribute('aria-current', 'page')
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

  it('sem onLogout, encerra a sessão e volta ao login (FE-04)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)
    navegacao.push.mockClear()
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))

    await vi.waitFor(() => expect(navegacao.push).toHaveBeenCalledWith('/login'))
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/sessao', { method: 'DELETE' })
    vi.unstubAllGlobals()
  })

  it.each(PERFIS)(
    'mostra apenas as rotas do perfil $perfil (FEP-10)',
    ({ perfil, itens }) => {
      render(<AppShell perfil={perfil}>{conteudo}</AppShell>)

      const links = screen.queryAllByRole('link')
      expect(links).toHaveLength(itens.length)
      for (const item of itens) {
        expect(screen.getByRole('link', { name: item.nome })).toHaveAttribute('href', item.href)
      }
    },
  )

  it('não mostra rotas de outros perfis para o responsável técnico (FEP-10)', () => {
    render(<AppShell perfil="TECHNICAL_RESPONSIBLE">{conteudo}</AppShell>)

    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(
      screen.getByText('Sem telas disponíveis para o seu perfil.'),
    ).toBeInTheDocument()
  })

  it('o gerente vê a fila e não vê rotas de expedição ou administração (FEP-10, QF-10)', () => {
    render(<AppShell perfil="PRODUCTION_MANAGER">{conteudo}</AppShell>)

    expect(screen.getByRole('link', { name: 'Fila' })).toHaveAttribute('href', '/operador/fila')
    expect(screen.queryByRole('link', { name: 'Entregas' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Usuários' })).not.toBeInTheDocument()
  })
})

describe('AppShell responsivo (VIS-01, VIS-02, VIS-03)', () => {
  it('mostra a navegação lateral a partir de 768px e a esconde no celular (VIS-01, VIS-02)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    expect(nav).toHaveClass('md:block')
    expect(nav).toHaveClass('hidden')
  })

  it('expõe a marca e o perfil no topbar (VIS-01)', () => {
    render(<AppShell perfil="PRODUCTION_MANAGER">{conteudo}</AppShell>)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByText('3E Operações')).toBeInTheDocument()
    expect(screen.getAllByText('Gerente de Produção').length).toBeGreaterThan(0)
  })

  it('não cria rolagem horizontal: lateral com largura fixa e main que pode encolher (VIS-03)', () => {
    const { container } = render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toHaveClass('md:w-60')
    expect(screen.getByRole('main')).toHaveClass('min-w-0')
    expect(container.firstElementChild).toHaveClass('overflow-x-hidden')
  })

  it('usa alvos de toque grandes nos links da lateral (VIS-01)', () => {
    render(<AppShell perfil="OPERATOR">{conteudo}</AppShell>)

    expect(screen.getByRole('link', { name: 'Fila' })).toHaveClass('min-h-11')
  })
})
