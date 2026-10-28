// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
}))

import { HistoricoPrazos } from './historico-prazos'

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(cleanup)

describe('HistoricoPrazos', () => {
  it('carrega sob demanda e mostra quem alterou, quando e de/para', async () => {
    mocks.apiGet.mockResolvedValue({
      historico: [
        {
          id: 'h1',
          createdAt: '2026-10-27T12:30:00.000Z',
          userName: 'Marcos Gerente',
          before: '2026-10-20T15:00:00.000Z',
          after: '2026-10-25T15:00:00.000Z',
        },
      ],
    })
    render(<HistoricoPrazos itemId="item_1" />)

    const botao = screen.getByRole('button', { name: /histórico de prazos/i })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(mocks.apiGet).not.toHaveBeenCalled()

    fireEvent.click(botao)

    expect(await screen.findByText(/Marcos Gerente/)).toBeInTheDocument()
    expect(screen.getByText('20/10/2026 → 25/10/2026')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos/itens/item_1/prazo/historico')
  })

  it('mostra estado vazio quando não há alterações', async () => {
    mocks.apiGet.mockResolvedValue({ historico: [] })
    render(<HistoricoPrazos itemId="item_1" />)

    fireEvent.click(screen.getByRole('button', { name: /histórico de prazos/i }))

    expect(await screen.findByText('Nenhuma alteração de prazo registrada.')).toBeInTheDocument()
  })

  it('mostra erro e permite tentar de novo', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce({
      historico: [
        {
          id: 'h1',
          createdAt: '2026-10-27T12:30:00.000Z',
          userName: 'Marcos Gerente',
          before: null,
          after: '2026-10-25T15:00:00.000Z',
        },
      ],
    })
    render(<HistoricoPrazos itemId="item_1" />)

    fireEvent.click(screen.getByRole('button', { name: /histórico de prazos/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText(/Definido para 25\/10\/2026/)).toBeInTheDocument()
  })
})
