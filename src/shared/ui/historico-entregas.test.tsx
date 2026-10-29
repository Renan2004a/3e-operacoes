// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
}))

import { HistoricoEntregas } from './historico-entregas'

const ENTREGAS = [
  {
    id: 'e1',
    quantidade: '2.5',
    usuarioId: 'u1',
    usuarioNome: 'Paula Expedição',
    occurredAt: '2026-10-27T15:30:00.000Z',
    excecao: false,
  },
  {
    id: 'e2',
    quantidade: '4',
    usuarioId: 'u2',
    usuarioNome: 'Marcos Gerente',
    occurredAt: '2026-10-28T13:00:00.000Z',
    excecao: true,
  },
]

beforeEach(() => {
  mocks.apiGet.mockReset()
})

afterEach(cleanup)

describe('HistoricoEntregas', () => {
  it('carrega sob demanda e mostra quantidade, quem entregou e quando', async () => {
    mocks.apiGet.mockResolvedValue({ entregas: ENTREGAS })
    render(<HistoricoEntregas itemId="item_1" unidade="M" />)

    const botao = screen.getByRole('button', { name: /histórico de entregas/i })
    expect(botao).toHaveAttribute('aria-expanded', 'false')
    expect(mocks.apiGet).not.toHaveBeenCalled()

    fireEvent.click(botao)

    expect(await screen.findByText(/Paula Expedição/)).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/pedidos/itens/item_1/entregas')
    expect(screen.getByText('2,50 M entregues')).toBeInTheDocument()
    expect(screen.getByText(/27\/10\/2026.*12:30/)).toBeInTheDocument()
  })

  it('mostra a entrega mais recente primeiro', async () => {
    mocks.apiGet.mockResolvedValue({ entregas: ENTREGAS })
    render(<HistoricoEntregas itemId="item_1" unidade="M" />)

    fireEvent.click(screen.getByRole('button', { name: /histórico de entregas/i }))

    const itens = await screen.findAllByRole('listitem')
    expect(within(itens[0]).getByText(/Marcos Gerente/)).toBeInTheDocument()
    expect(within(itens[1]).getByText(/Paula Expedição/)).toBeInTheDocument()
  })

  it('marca com texto a entrega feita por exceção acima do disponível', async () => {
    mocks.apiGet.mockResolvedValue({ entregas: ENTREGAS })
    render(<HistoricoEntregas itemId="item_1" unidade="PC" />)

    fireEvent.click(screen.getByRole('button', { name: /histórico de entregas/i }))

    const itens = await screen.findAllByRole('listitem')
    expect(within(itens[0]).getByText('Exceção autorizada')).toBeInTheDocument()
    expect(within(itens[1]).queryByText('Exceção autorizada')).not.toBeInTheDocument()
  })

  it('mostra estado vazio quando nada foi entregue', async () => {
    mocks.apiGet.mockResolvedValue({ entregas: [] })
    render(<HistoricoEntregas itemId="item_1" unidade="PC" />)

    fireEvent.click(screen.getByRole('button', { name: /histórico de entregas/i }))

    expect(await screen.findByText('Nenhuma entrega registrada.')).toBeInTheDocument()
  })

  it('mostra erro e permite tentar de novo', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce({
      entregas: [ENTREGAS[0]],
    })
    render(<HistoricoEntregas itemId="item_1" unidade="M" />)

    fireEvent.click(screen.getByRole('button', { name: /histórico de entregas/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))
    expect(await screen.findByText(/Paula Expedição/)).toBeInTheDocument()
  })

  it('recarrega quando uma nova entrega é registrada com o histórico aberto', async () => {
    mocks.apiGet.mockResolvedValueOnce({ entregas: [ENTREGAS[0]] })
    const { rerender } = render(
      <HistoricoEntregas itemId="item_1" unidade="M" atualizarQuando="2.5" />,
    )

    fireEvent.click(screen.getByRole('button', { name: /histórico de entregas/i }))
    await screen.findByText(/Paula Expedição/)

    mocks.apiGet.mockResolvedValueOnce({ entregas: ENTREGAS })
    rerender(<HistoricoEntregas itemId="item_1" unidade="M" atualizarQuando="6.5" />)

    expect(await screen.findByText(/Marcos Gerente/)).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledTimes(2)
  })

  it('não consulta a API por mudança de quantidade enquanto fechado', async () => {
    const { rerender } = render(
      <HistoricoEntregas itemId="item_1" unidade="M" atualizarQuando="2.5" />,
    )

    rerender(<HistoricoEntregas itemId="item_1" unidade="M" atualizarQuando="6.5" />)

    await waitFor(() => expect(mocks.apiGet).not.toHaveBeenCalled())
  })
})
