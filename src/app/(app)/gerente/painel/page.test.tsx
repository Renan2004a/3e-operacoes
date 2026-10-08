// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useParams: () => ({}),
}))

import PainelPage from './page'

function indicadores() {
  return {
    painel: {
      porSetor: [
        { sectorId: 'setor-corte', total: 3 },
        { sectorId: 'setor-telhas', total: 1 },
      ],
      porStatus: [
        { status: 'PENDING', total: 2 },
        { status: 'COMPLETED', total: 5 },
      ],
      pendencias: 2,
    },
    pcp: {
      producaoPorSetor: [{ sectorId: 'setor-corte', quantidade: '12.5' }],
      cumprimentoPrazo: { concluidasComPrazo: 4, concluidasNoPrazo: 3, percentual: 75 },
    },
  }
}

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(cleanup)

describe('PainelPage', () => {
  it('mostra o estado de carregando enquanto busca os indicadores (FEP-01)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<PainelPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('mostra a contagem por setor, por status e as pendências (FEP-01)', async () => {
    mocks.apiGet.mockResolvedValue(indicadores())
    render(<PainelPage />)

    expect(await screen.findByText('setor-corte: 3')).toBeInTheDocument()
    expect(screen.getByText('setor-telhas: 1')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('Total: 2')).toBeInTheDocument()
    expect(screen.getByText('Pendências').closest('div.rounded-card')).toHaveTextContent('2')
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/indicadores')
  })

  it('mostra a produção por setor e o cumprimento de prazo (FEP-02)', async () => {
    mocks.apiGet.mockResolvedValue(indicadores())
    render(<PainelPage />)

    expect(await screen.findByText('setor-corte: 12.5')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('3 de 4 no prazo.')).toBeInTheDocument()
  })

  it('rotula o status com texto, sem depender apenas de cor (FEP-01)', async () => {
    mocks.apiGet.mockResolvedValue(indicadores())
    render(<PainelPage />)

    expect(await screen.findByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('Concluída')).toBeInTheDocument()
  })

  it('mostra erro acessível e permite tentar de novo (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<PainelPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar o painel/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('ao tentar de novo refaz a busca e mostra os indicadores (FEP-13)', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce(indicadores())
    render(<PainelPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('setor-corte: 3')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledTimes(2)
  })

  it('usa o cabeçalho de página com o título do painel (VIS-09)', async () => {
    mocks.apiGet.mockResolvedValue(indicadores())
    render(<PainelPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('mostra métricas de produção e o progresso por setor (PROT-05)', async () => {
    mocks.apiGet.mockResolvedValue(indicadores())
    render(<PainelPage />)

    expect(await screen.findByText('Concluídas')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Produção do setor setor-corte' }),
    ).toBeInTheDocument()
  })
})
