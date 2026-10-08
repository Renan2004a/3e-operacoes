// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
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
  apiPost: mocks.apiPost,
  apiPatch: vi.fn(),
  ApiError: mocks.ApiError,
}))

import ImportarPedidoPage from './page'

function preencherNumero(valor: string) {
  fireEvent.change(screen.getByLabelText('Número do pedido'), { target: { value: valor } })
  fireEvent.click(screen.getByRole('button', { name: 'Importar pedido' }))
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

describe('ImportarPedidoPage', () => {
  it('campo do número é rotulado e usa teclado numérico (LAC-01, a11y)', () => {
    render(<ImportarPedidoPage />)

    const input = screen.getByLabelText('Número do pedido')
    expect(input).toHaveAttribute('inputmode', 'numeric')
  })

  it('número inválido mostra erro sem chamar a API (LAC-02)', async () => {
    render(<ImportarPedidoPage />)

    preencherNumero('abc')

    expect(await screen.findByRole('alert')).toHaveTextContent(/número de pedido válido/i)
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('número válido importa e mostra o status do job (LAC-01)', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockResolvedValue({ jobId: 'job_1', status: 'SUCCEEDED', events: [] })
    render(<ImportarPedidoPage />)

    preencherNumero('70435')

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/integracao/pedidos', {
        orderNumber: '70435',
      }),
    )
    expect(await screen.findByText('Job job_1')).toBeInTheDocument()
  })

  it('atualiza o status até concluir (LAC-03)', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    let chamadas = 0
    mocks.apiGet.mockImplementation(() => {
      chamadas += 1
      return Promise.resolve(
        chamadas === 1
          ? { jobId: 'job_1', status: 'DISPATCHED', events: [] }
          : { jobId: 'job_1', status: 'SUCCEEDED', events: [] },
      )
    })
    render(<ImportarPedidoPage />)

    preencherNumero('70435')

    expect(await screen.findByText('Despachado')).toBeInTheDocument()
    expect(await screen.findByText('Concluído', {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('mostra o errorCode quando a importação falha (edge case)', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'FAILED',
      events: [{ type: 'FAILED', detail: 'ORDER_NOT_FOUND' }],
    })
    render(<ImportarPedidoPage />)

    preencherNumero('70435')

    expect(await screen.findByText('Código do erro: ORDER_NOT_FOUND')).toBeInTheDocument()
  })

  it('mostra erro acessível quando a API recusa o número (LAC-02)', async () => {
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(400, 'invalid_order_number'))
    render(<ImportarPedidoPage />)

    preencherNumero('70435')

    expect(await screen.findByRole('alert')).toHaveTextContent(/número de pedido inválido/i)
  })

  it('mostra erro quando o job não é encontrado na consulta de status (edge case)', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockRejectedValue(new mocks.ApiError(404, 'job_not_found'))
    render(<ImportarPedidoPage />)

    preencherNumero('70435')

    expect(await screen.findByRole('alert')).toHaveTextContent(/job de importação não encontrado/i)
  })
})
