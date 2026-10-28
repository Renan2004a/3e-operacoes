// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

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

import AtividadesPage from './page'

const ATIVIDADE = {
  id: 'a1',
  orderId: 'o1',
  orderNumber: '82269',
  itemDescription: 'Perfil UE',
  sectorName: 'Corte e Dobra',
  status: 'IN_PROGRESS' as const,
  priority: 0,
  deadlineAt: '2026-10-30T12:00:00.000Z',
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  window.history.pushState({}, '', '/gerente/atividades?status=IN_PROGRESS')
})

afterEach(cleanup)

describe('AtividadesPage', () => {
  it('lista as atividades do filtro da URL (P07)', async () => {
    mocks.apiGet.mockResolvedValue({ atividades: [ATIVIDADE] })
    render(<AtividadesPage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Atividades em execução' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Pedido 82269/)).toBeInTheDocument()
    expect(screen.getByText(/Setor: Corte e Dobra/)).toBeInTheDocument()
    expect(screen.getByText(/Prazo: 30\/10\/2026/)).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/indicadores/atividades?status=IN_PROGRESS')
    expect(screen.getByRole('link', { name: '← Voltar para o painel' })).toHaveAttribute(
      'href',
      '/gerente/painel',
    )
  })

  it('mostra estado vazio quando não há atividades', async () => {
    mocks.apiGet.mockResolvedValue({ atividades: [] })
    render(<AtividadesPage />)

    expect(await screen.findByText('Nada por aqui')).toBeInTheDocument()
  })

  it('mostra erro e permite tentar de novo', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha'))
    render(<AtividadesPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      /não foi possível carregar as atividades/i,
    )
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('usa o filtro padrão de pendentes quando a URL não traz status', async () => {
    window.history.pushState({}, '', '/gerente/atividades')
    mocks.apiGet.mockResolvedValue({ atividades: [] })
    render(<AtividadesPage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Atividades pendentes' }),
    ).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/indicadores/atividades?status=ABERTAS')
  })
})
