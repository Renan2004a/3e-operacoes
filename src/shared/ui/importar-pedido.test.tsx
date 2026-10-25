// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

import { ImportarPedido, LIMITE_ACOMPANHAMENTO_PADRAO_MS } from './importar-pedido'

interface RespostaStatus {
  jobId: string
  status: 'PENDING' | 'DISPATCHED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
  events: Array<{ type: string; detail: string | null }>
}

function promessaAdiada<T>() {
  let resolver!: (valor: T) => void
  const promessa = new Promise<T>((resolve) => {
    resolver = resolve
  })
  return { promessa, resolver }
}

async function assentar() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

async function avancar(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

async function iniciar(numero = '70435') {
  fireEvent.change(screen.getByLabelText('Número do pedido'), { target: { value: numero } })
  fireEvent.click(screen.getByRole('button', { name: 'Importar pedido' }))
  await assentar()
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
  mocks.apiPost.mockResolvedValue({ jobId: 'job_1' })
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ImportarPedido — espera prolongada', () => {
  it('suspende o polling no limite e mantém o job como RUNNING', async () => {
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'RUNNING',
      events: [],
    } satisfies RespostaStatus)

    render(<ImportarPedido limiteAcompanhamentoMs={4_500} />)
    await iniciar()

    expect(screen.getByText('Processando')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledTimes(1)

    await avancar(1_500)
    expect(mocks.apiGet).toHaveBeenCalledTimes(2)
    await avancar(1_500)
    expect(mocks.apiGet).toHaveBeenCalledTimes(3)

    expect(screen.getByText(/A importação está demorando mais que o esperado/)).toBeInTheDocument()
    expect(screen.getByText('Processando')).toBeInTheDocument()
    expect(screen.queryByText('Importação falhou')).not.toBeInTheDocument()

    await avancar(10_000)
    expect(mocks.apiGet).toHaveBeenCalledTimes(3)
  })

  it('consulta o mesmo job manualmente e reconhece sucesso sem novo POST', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      jobId: 'job_1',
      status: 'RUNNING',
      events: [],
    } satisfies RespostaStatus)

    render(<ImportarPedido limiteAcompanhamentoMs={1_500} />)
    await iniciar()

    expect(screen.getByText(/A importação está demorando mais que o esperado/)).toBeInTheDocument()

    mocks.apiGet.mockResolvedValueOnce({
      jobId: 'job_1',
      status: 'SUCCEEDED',
      events: [{ type: 'SUCCEEDED', detail: null }],
    } satisfies RespostaStatus)

    fireEvent.click(screen.getByRole('button', { name: 'Consultar andamento' }))
    await assentar()

    expect(screen.getByText('Importação concluída')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/integracao/pedidos/job_1')
    expect(mocks.apiPost).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Consultar andamento' })).not.toBeInTheDocument()
  })

  it('consulta o mesmo job manualmente e reconhece falha confirmada', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      jobId: 'job_1',
      status: 'RUNNING',
      events: [],
    } satisfies RespostaStatus)

    render(<ImportarPedido limiteAcompanhamentoMs={1_500} />)
    await iniciar()

    mocks.apiGet.mockResolvedValueOnce({
      jobId: 'job_1',
      status: 'FAILED',
      events: [{ type: 'FAILED', detail: 'ORDER_NOT_FOUND' }],
    } satisfies RespostaStatus)

    fireEvent.click(screen.getByRole('button', { name: 'Consultar andamento' }))
    await assentar()

    expect(screen.getByText('Código do erro: ORDER_NOT_FOUND')).toBeInTheDocument()
    expect(mocks.apiPost).toHaveBeenCalledTimes(1)
  })

  it('não apresenta erro de consulta como falha da importação', async () => {
    mocks.apiGet
      .mockResolvedValueOnce({
        jobId: 'job_1',
        status: 'RUNNING',
        events: [],
      } satisfies RespostaStatus)
      .mockRejectedValueOnce(new Error('rede indisponível'))

    render(<ImportarPedido limiteAcompanhamentoMs={3_000} />)
    await iniciar()

    expect(screen.getByText('Processando')).toBeInTheDocument()

    await avancar(1_500)

    expect(screen.getByText('Não foi possível consultar o andamento')).toBeInTheDocument()
    expect(screen.getByText(/pode continuar em andamento/)).toBeInTheDocument()
    expect(screen.queryByText('Importação falhou')).not.toBeInTheDocument()
    expect(screen.getByText('Processando')).toBeInTheDocument()

    await avancar(10_000)
    expect(mocks.apiGet).toHaveBeenCalledTimes(2)
  })

  it('descarta resposta atrasada de uma tentativa anterior', async () => {
    const atrasada = promessaAdiada<RespostaStatus>()
    mocks.apiPost
      .mockResolvedValueOnce({ jobId: 'job_1' })
      .mockResolvedValueOnce({ jobId: 'job_2' })
    mocks.apiGet.mockImplementation((url: string) =>
      url.endsWith('job_1')
        ? atrasada.promessa
        : Promise.resolve({
            jobId: 'job_2',
            status: 'SUCCEEDED',
            events: [{ type: 'SUCCEEDED', detail: null }],
          } satisfies RespostaStatus),
    )

    render(<ImportarPedido />)
    await iniciar('70435')

    expect(screen.getByText(/Pedido 70435/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Número do pedido'), { target: { value: '70436' } })
    fireEvent.click(screen.getByRole('button', { name: 'Importar pedido' }))
    await assentar()

    expect(screen.getByText(/Pedido 70436/)).toBeInTheDocument()
    expect(screen.getByText('Importação concluída')).toBeInTheDocument()

    await act(async () => {
      atrasada.resolver({
        jobId: 'job_1',
        status: 'FAILED',
        events: [{ type: 'FAILED', detail: 'ORDER_NOT_FOUND' }],
      })
    })
    await assentar()

    expect(screen.getByText('Importação concluída')).toBeInTheDocument()
    expect(screen.queryByText('Importação falhou')).not.toBeInTheDocument()
  })

  it('distingue falha confirmada do conector de erro de consulta', async () => {
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'FAILED',
      events: [{ type: 'FAILED', detail: 'CONNECTOR_UNAVAILABLE' }],
    } satisfies RespostaStatus)

    render(<ImportarPedido />)
    await iniciar()

    expect(screen.getByText('Importação falhou')).toBeInTheDocument()
    expect(screen.getByText('Código do erro: CONNECTOR_UNAVAILABLE')).toBeInTheDocument()
    expect(screen.queryByText('Não foi possível consultar o andamento')).not.toBeInTheDocument()
  })

  it('limpa o timer ao desmontar o componente', async () => {
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      status: 'RUNNING',
      events: [],
    } satisfies RespostaStatus)

    const { unmount } = render(<ImportarPedido />)
    await iniciar()

    expect(mocks.apiGet).toHaveBeenCalledTimes(1)

    unmount()
    await avancar(10_000)

    expect(mocks.apiGet).toHaveBeenCalledTimes(1)
  })

  it('documenta o limite padrão como parâmetro técnico conservador', () => {
    expect(LIMITE_ACOMPANHAMENTO_PADRAO_MS).toBe(60_000)
  })
})
