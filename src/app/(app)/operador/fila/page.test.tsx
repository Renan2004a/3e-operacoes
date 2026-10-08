// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

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

import FilaPage from './page'

function atividade(overrides: Record<string, unknown> = {}) {
  return {
    id: 'atv_1',
    orderItemId: 'item_1',
    sectorId: 'setor_1',
    status: 'PENDING',
    priority: 1,
    itemDescription: 'Chapa dobrada',
    productCode: 'PRD-1',
    orderNumber: '100',
    sectorName: 'Corte e Dobra',
    ...overrides,
  }
}

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(cleanup)

describe('FilaPage', () => {
  it('mostra o estado de carregando enquanto busca (FE-08)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<FilaPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista as atividades dos setores do usuário (FE-07)', async () => {
    mocks.apiGet.mockResolvedValue({ atividades: [atividade()] })
    render(<FilaPage />)

    expect(await screen.findByText('Chapa dobrada')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/producao/atividades')
  })

  it('mostra estado vazio quando não há atividades (FE-08)', async () => {
    mocks.apiGet.mockResolvedValue({ atividades: [] })
    render(<FilaPage />)

    expect(await screen.findByText('Sem atividades na fila')).toBeInTheDocument()
  })

  it('mostra erro acessível e permite tentar de novo (FE-14)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<FilaPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar a fila/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('ao tentar de novo refaz a busca e mostra os dados (FE-14)', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce({
      atividades: [atividade()],
    })
    render(<FilaPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Chapa dobrada')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledTimes(2)
  })

  it('cada atividade leva à página de execução (FE-07)', async () => {
    mocks.apiGet.mockResolvedValue({ atividades: [atividade()] })
    render(<FilaPage />)

    const link = await screen.findByRole('link', { name: 'Abrir' })
    expect(link).toHaveAttribute('href', '/operador/atividades/atv_1')
  })

  it('usa o cabeçalho de página com o título da fila (VIS-09)', async () => {
    mocks.apiGet.mockResolvedValue({ atividades: [atividade()] })
    render(<FilaPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Minha fila' })).toBeInTheDocument()
  })

  it('mostra setor e prioridade no card da atividade (PROT-05)', async () => {
    mocks.apiGet.mockResolvedValue({
      atividades: [atividade({ priority: 2, sectorId: 'setor_corte', sectorName: 'Corte e Dobra' })],
    })
    render(<FilaPage />)

    expect(await screen.findByText(/prioridade 2/i)).toBeInTheDocument()
    expect(screen.getByText(/corte e dobra/i)).toBeInTheDocument()
  })
})
