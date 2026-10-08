// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    code: string
    constructor(status: number, code: string, message?: string) {
      super(message ?? code)
      this.status = status
      this.code = code
    }
  },
}))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: mocks.ApiError,
}))

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'atv_1' }),
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

import OrdemProducaoPage from './page'

function ordem() {
  return {
    atividadeId: 'atv_1',
    pedido: '70435',
    item: 'TELHA ONDULADA',
    setor: 'Telhas',
    unidade: 'M',
    solicitado: '10',
    executado: '8',
    pendente: '2',
  }
}

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('OrdemProducaoPage', () => {
  it('mostra carregando enquanto busca a ordem (LAC-07)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<OrdemProducaoPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('mostra pedido, item, setor, solicitado, executado e pendente (LAC-07)', async () => {
    mocks.apiGet.mockResolvedValue({ ordem: ordem() })
    render(<OrdemProducaoPage />)

    expect(await screen.findByRole('heading', { level: 2, name: 'TELHA ONDULADA' })).toBeInTheDocument()
    expect(screen.getByText('Pedido 70435 · Setor Telhas')).toBeInTheDocument()
    expect(screen.getByText('10 M')).toBeInTheDocument()
    expect(screen.getByText('8 M')).toBeInTheDocument()
    expect(screen.getByText('2 M')).toBeInTheDocument()
  })

  it('usa o cabeçalho de página e busca a ordem da atividade (LAC-07)', async () => {
    mocks.apiGet.mockResolvedValue({ ordem: ordem() })
    render(<OrdemProducaoPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Ordem de produção' })).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/producao/atividades/atv_1/ordem')
  })

  it('aciona a impressão pelo botão (LAC-08)', async () => {
    const imprimir = vi.fn()
    vi.stubGlobal('print', imprimir)
    mocks.apiGet.mockResolvedValue({ ordem: ordem() })
    render(<OrdemProducaoPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Imprimir ordem de produção' }))

    expect(imprimir).toHaveBeenCalledTimes(1)
  })

  it('esconde as ações no estilo de impressão (LAC-08)', async () => {
    mocks.apiGet.mockResolvedValue({ ordem: ordem() })
    render(<OrdemProducaoPage />)

    const botao = await screen.findByRole('button', { name: 'Imprimir ordem de produção' })
    expect(botao.closest('.print\\:hidden')).not.toBeNull()
  })

  it('mostra atividade não encontrada quando a API responde 404 (LAC-07)', async () => {
    mocks.apiGet.mockRejectedValue(new mocks.ApiError(404, 'activity_not_found'))
    render(<OrdemProducaoPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/atividade não encontrada/i)
  })

  it('mostra erro acessível e permite tentar de novo (LAC-07)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<OrdemProducaoPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar a ordem/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
