// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}))

import EntregasPage from './page'

const PEDIDOS = {
  pedidos: [
    { id: 'p1', numero: '100', cliente: 'Ana', status: 'IN_PROGRESS', previsao: null },
    { id: 'p2', numero: '101', cliente: 'Bruno', status: 'PENDING', previsao: null },
  ],
  paginacao: { limite: 20, offset: 0, pagina: 1, total: 2, totalPaginas: 1 },
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.push.mockReset()
  window.history.replaceState({}, '', '/expedicao/entregas')
})

afterEach(cleanup)

describe('EntregasPage (lista de pedidos)', () => {
  it('usa o cabeçalho de página com o título', async () => {
    mocks.apiGet.mockResolvedValue(PEDIDOS)
    render(<EntregasPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Entregas' })).toBeInTheDocument()
    await screen.findByText('Pedido 100')
  })

  it('mostra número e cliente de cada pedido e a busca por número e cliente (H6)', async () => {
    mocks.apiGet.mockResolvedValue(PEDIDOS)
    render(<EntregasPage />)

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Bruno')).toBeInTheDocument()
    expect(screen.getByLabelText('Pesquisar por número')).toBeInTheDocument()
    expect(screen.getByLabelText('Cliente')).toBeInTheDocument()
  })

  it('abrir o pedido navega para a rota própria dele (H4)', async () => {
    mocks.apiGet.mockResolvedValue(PEDIDOS)
    render(<EntregasPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 100' }))

    expect(mocks.push).toHaveBeenCalledWith('/expedicao/entregas/p1')
  })

  it('a busca aplicada é levada ao detalhe para o "Voltar" restaurar a lista (H3)', async () => {
    window.history.replaceState({}, '', '/expedicao/entregas?numero=10&pagina=1')
    mocks.apiGet.mockResolvedValue(PEDIDOS)
    render(<EntregasPage />)

    fireEvent.click(await screen.findByRole('button', { name: 'Abrir pedido 101' }))

    expect(mocks.push).toHaveBeenCalledWith(
      `/expedicao/entregas/p2?retorno=${encodeURIComponent('/expedicao/entregas?numero=10&pagina=1')}`,
    )
  })

  it('não limita a escolha aos 20 pedidos mais recentes: pagina a lista (H6)', async () => {
    mocks.apiGet.mockResolvedValue({
      ...PEDIDOS,
      paginacao: { limite: 20, offset: 0, pagina: 1, total: 45, totalPaginas: 3 },
    })
    render(<EntregasPage />)

    expect(await screen.findByText(/45 pedidos encontrados — página 1 de 3/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Próxima' })).toBeEnabled()
  })

  it('mostra erro e permite tentar de novo', async () => {
    mocks.apiGet.mockRejectedValueOnce(new Error('falha')).mockResolvedValueOnce(PEDIDOS)
    render(<EntregasPage />)

    expect(await screen.findByRole('alert')).toHaveTextContent(/não foi possível carregar/i)
    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByText('Pedido 100')).toBeInTheDocument()
  })
})
