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

  it('orienta o usuário quando o pedido não existe no Top Gerente', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'FAILED',
      errorCode: 'ORDER_NOT_FOUND',
      events: [{ type: 'FAILED', detail: 'ORDER_NOT_FOUND' }],
    })
    render(<ImportarPedidoPage />)

    preencherNumero('82269')

    expect(
      await screen.findByText(/Pedido não encontrado no Top Gerente\. Confira o número informado/),
    ).toBeInTheDocument()
    expect(screen.getByText(/pode ser diferente do número no 3E/)).toBeInTheDocument()
    expect(screen.getByText(/Código técnico: ORDER_NOT_FOUND/)).toBeInTheDocument()
  })

  it('mostra a falha atual e não um UPSERT_FAILED antigo do mesmo job', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'FAILED',
      errorCode: 'CONNECTOR_UNAVAILABLE',
      events: [
        { type: 'FAILED', detail: 'UPSERT_FAILED' },
        { type: 'RETRY', detail: 'CONNECTOR_UNAVAILABLE (tentativa 1/3)' },
        { type: 'FAILED', detail: 'CONNECTOR_UNAVAILABLE' },
      ],
    })
    render(<ImportarPedidoPage />)

    preencherNumero('82269')

    expect(
      await screen.findByText('Integração com o Top Gerente indisponível'),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Código técnico: UPSERT_FAILED/)).not.toBeInTheDocument()
    expect(screen.getByText(/Código técnico: CONNECTOR_UNAVAILABLE/)).toBeInTheDocument()
  })

  it('preserva o número digitado após a falha para permitir nova tentativa', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'FAILED',
      errorCode: 'UPSERT_FAILED',
      events: [{ type: 'FAILED', detail: 'UPSERT_FAILED' }],
    })
    render(<ImportarPedidoPage />)

    preencherNumero('82269')

    expect(await screen.findByText('Falha ao salvar os dados importados')).toBeInTheDocument()
    expect(screen.getByLabelText('Número do pedido')).toHaveValue('82269')
    expect(screen.getByRole('button', { name: 'Importar pedido' })).toBeEnabled()
  })

  it('informa quando o pedido já existia e foi atualizado (reimportação)', async () => {
    mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'SUCCEEDED',
      events: [{ type: 'SUCCEEDED', detail: 'REIMPORTED' }],
    })
    render(<ImportarPedidoPage />)

    preencherNumero('82269')

    expect(await screen.findByText('Pedido atualizado')).toBeInTheDocument()
    expect(screen.getByText(/histórico operacional foi preservado/)).toBeInTheDocument()
  })

  it('orienta a usar o número do Top Gerente junto ao campo', () => {
    render(<ImportarPedidoPage />)

    expect(
      screen.getByText(
        'Informe o número do pedido no Top Gerente. Ele pode ser diferente do número exibido no 3E.',
      ),
    ).toBeInTheDocument()
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
