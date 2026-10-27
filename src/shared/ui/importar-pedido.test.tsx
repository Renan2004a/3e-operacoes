// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {
    status: number
    code: string
    constructor(status = 0, code = '', message?: string) {
      super(message ?? code)
      this.status = status
      this.code = code
    }
  },
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

import { ImportarPedido } from './importar-pedido'

const SOLICITADO_EM = '2026-10-23T10:00:00.000Z'
const EVENTO_NOVO = '2026-10-23T10:00:10.000Z'
const EVENTO_ANTIGO = '2026-10-23T09:00:00.000Z'

function inicio(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 'job_1',
    orderId: null,
    status: 'PENDING',
    origem: 'NOVA',
    solicitadoEm: SOLICITADO_EM,
    ...overrides,
  }
}

function evento(type: string, detail: string | null = null, createdAt = EVENTO_NOVO) {
  return { type, detail, createdAt }
}

function status(overrides: Record<string, unknown> = {}) {
  return {
    jobId: 'job_1',
    orderId: 'order_1',
    status: 'SUCCEEDED',
    events: [evento('SUCCEEDED', 'IMPORTED')],
    ...overrides,
  }
}

function importar(numero = '70435') {
  fireEvent.change(screen.getByLabelText('Número do pedido'), { target: { value: numero } })
  fireEvent.click(screen.getByRole('button', { name: 'Importar pedido' }))
}

function renderizar(onConcluido = vi.fn()) {
  return render(
    <ImportarPedido
      onConcluido={onConcluido}
      hrefPedido={(orderId) => `/vendedor/pedidos/${orderId}`}
    />,
  )
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

describe('ImportarPedido — transparência', () => {
  it('distingue importação nova e oferece link para o pedido', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    mocks.apiGet.mockResolvedValue(status())
    renderizar()

    importar()

    expect(await screen.findByText('Importação concluída')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir pedido' })).toHaveAttribute(
      'href',
      '/vendedor/pedidos/order_1',
    )
    expect(screen.getByLabelText('Número do pedido')).toHaveValue('70435')
  })

  it('distingue consulta nova que atualizou pedido existente', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    mocks.apiGet.mockResolvedValue(status({ events: [evento('SUCCEEDED', 'REIMPORTED')] }))
    renderizar()

    importar()

    expect(await screen.findByText('Pedido atualizado')).toBeInTheDocument()
    expect(
      screen.getByText('O Top Gerente foi consultado e o pedido existente foi atualizado.'),
    ).toBeInTheDocument()
  })

  it('não apresenta resultado anterior como nova importação', async () => {
    mocks.apiPost.mockResolvedValue(inicio({ status: 'SUCCEEDED', origem: 'RESULTADO_ANTERIOR' }))
    mocks.apiGet.mockResolvedValue(status())
    renderizar()

    importar()

    expect(await screen.findByText('Resultado de importação anterior')).toBeInTheDocument()
    expect(screen.getByText(/Nenhuma nova consulta ao Top Gerente foi feita/)).toBeInTheDocument()
    expect(screen.queryByText('Importação concluída')).not.toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Abrir pedido' })).toBeInTheDocument()
  })

  it('não atribui nova consulta à tentativa que já estava em andamento', async () => {
    mocks.apiPost.mockResolvedValue(inicio({ status: 'RUNNING', origem: 'EM_ANDAMENTO' }))
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      orderId: null,
      status: 'RUNNING',
      events: [],
    })
    renderizar()

    importar()

    expect(await screen.findByText('Acompanhando tentativa em andamento')).toBeInTheDocument()
    expect(screen.getByText(/Esta tentativa já estava em andamento/)).toBeInTheDocument()
  })

  it('só aceita o estado final antigo quando há evento novo da consulta atual', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    let chamadas = 0
    mocks.apiGet.mockImplementation(() => {
      chamadas += 1
      return Promise.resolve(
        chamadas === 1
          ? status({ events: [evento('SUCCEEDED', 'IMPORTED', EVENTO_ANTIGO)] })
          : status({
              orderId: 'order_2',
              events: [
                evento('SUCCEEDED', 'IMPORTED', EVENTO_ANTIGO),
                evento('SUCCEEDED', 'IMPORTED', EVENTO_NOVO),
              ],
            }),
      )
    })
    renderizar()

    importar()

    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Importação concluída')).not.toBeInTheDocument()
    expect(
      await screen.findByText('Importação concluída', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir pedido' })).toHaveAttribute(
      'href',
      '/vendedor/pedidos/order_2',
    )
  })

  it('não aceita falha antiga como resultado da consulta nova', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    let chamadas = 0
    mocks.apiGet.mockImplementation(() => {
      chamadas += 1
      return Promise.resolve({
        jobId: 'job_1',
        orderId: null,
        status: 'FAILED',
        events:
          chamadas === 1
            ? [evento('FAILED', 'ORDER_NOT_FOUND', EVENTO_ANTIGO)]
            : [evento('FAILED', 'CONNECTOR_TIMEOUT', EVENTO_NOVO)],
      })
    })
    renderizar()

    importar()

    await waitFor(() => expect(mocks.apiGet).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('Consulta ao Top Gerente falhou')).not.toBeInTheDocument()
    expect(
      await screen.findByText('Consulta ao Top Gerente falhou', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Código técnico: CONNECTOR_TIMEOUT')).toBeInTheDocument()
  })

  it('informa divergência de unidade preservada ao Vendedor', async () => {
    const divergencias = [
      {
        legacyItemKey: '1',
        description: 'TELHA',
        unidadeAnterior: 'UN',
        unidadeNova: 'M',
        motivo: 'REGISTROS_OPERACIONAIS',
      },
    ]
    mocks.apiPost.mockResolvedValue(inicio())
    mocks.apiGet.mockResolvedValue(
      status({
        events: [
          evento('SUCCEEDED', 'IMPORTED'),
          evento('UNIT_DIVERGENCE', JSON.stringify(divergencias)),
        ],
      }),
    )
    renderizar()

    importar()

    expect(await screen.findByText('Unidade preservada')).toBeInTheDocument()
    expect(screen.getByText(/TELHA/)).toBeInTheDocument()
    expect(screen.getByText('UN')).toBeInTheDocument()
    expect(screen.getByText('M')).toBeInTheDocument()
  })

  it('distingue falha atual de tentativa anterior reutilizada', async () => {
    mocks.apiPost.mockResolvedValue(inicio({ status: 'FAILED', origem: 'RESULTADO_ANTERIOR' }))
    mocks.apiGet.mockResolvedValue(
      status({ orderId: null, status: 'FAILED', events: [evento('FAILED', 'ORDER_NOT_FOUND')] }),
    )
    renderizar()

    importar()

    expect(await screen.findByText('Tentativa anterior falhou')).toBeInTheDocument()
    expect(await screen.findByText('Código técnico: ORDER_NOT_FOUND')).toBeInTheDocument()
  })

  it('orienta sobre pedido inexistente em vez de mostrar apenas o código técnico (#5)', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    mocks.apiGet.mockResolvedValue(
      status({ orderId: null, status: 'FAILED', events: [evento('FAILED', 'ORDER_NOT_FOUND')] }),
    )
    renderizar()

    importar()

    expect(await screen.findByText('Consulta ao Top Gerente falhou')).toBeInTheDocument()
    expect(screen.getByText(/Pedido não encontrado no Top Gerente/)).toBeInTheDocument()
    expect(screen.getByText(/pode ser diferente do número no 3E/)).toBeInTheDocument()
    expect(screen.getByText('Código técnico: ORDER_NOT_FOUND')).toBeInTheDocument()
  })

  it('prioriza o errorCode atual do job sobre o detalhe do evento (#5)', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    mocks.apiGet.mockResolvedValue(
      status({
        orderId: null,
        status: 'FAILED',
        errorCode: 'CONNECTOR_TIMEOUT',
        events: [evento('FAILED', 'ORDER_NOT_FOUND')],
      }),
    )
    renderizar()

    importar()

    expect(await screen.findByText('Consulta ao Top Gerente falhou')).toBeInTheDocument()
    expect(screen.getByText(/não respondeu dentro do tempo esperado/)).toBeInTheDocument()
    expect(screen.getByText('Código técnico: CONNECTOR_TIMEOUT')).toBeInTheDocument()
  })

  it('explica falha de tempo do conector sem substituir a transparência da consulta', async () => {
    mocks.apiPost.mockResolvedValue(inicio())
    mocks.apiGet.mockResolvedValue(
      status({
        orderId: null,
        status: 'FAILED',
        events: [evento('FAILED', 'CONNECTOR_TIMEOUT')],
      }),
    )
    renderizar()

    importar()

    expect(await screen.findByText('Consulta ao Top Gerente falhou')).toBeInTheDocument()
    expect(screen.getByText(/não respondeu dentro do tempo esperado/)).toBeInTheDocument()
    expect(screen.getByText('Código técnico: CONNECTOR_TIMEOUT')).toBeInTheDocument()
  })
})

describe('ImportarPedido — espera prolongada (#13)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mocks.apiPost.mockReset()
    mocks.apiGet.mockReset()
    mocks.apiPost.mockResolvedValue(inicio())
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

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

  it('suspende o acompanhamento no limite e informa que a importação demora', async () => {
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      orderId: null,
      status: 'RUNNING',
      events: [],
    })

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

  it('consulta o mesmo job manualmente e reconhece o sucesso sem novo POST', async () => {
    mocks.apiGet.mockResolvedValueOnce({
      jobId: 'job_1',
      orderId: null,
      status: 'RUNNING',
      events: [],
    })

    render(<ImportarPedido limiteAcompanhamentoMs={1_500} />)
    await iniciar()

    expect(screen.getByText(/A importação está demorando mais que o esperado/)).toBeInTheDocument()

    mocks.apiGet.mockResolvedValueOnce({
      jobId: 'job_1',
      orderId: 'order_1',
      status: 'SUCCEEDED',
      events: [evento('SUCCEEDED', 'IMPORTED')],
    })

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Consultar andamento' }))
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Importação concluída')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenLastCalledWith('/api/integracao/pedidos/job_1')
    expect(mocks.apiPost).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Consultar andamento' })).not.toBeInTheDocument()
  })

  it('não trata falha de consulta como falha da importação', async () => {
    mocks.apiGet
      .mockResolvedValueOnce({
        jobId: 'job_1',
        orderId: null,
        status: 'RUNNING',
        events: [],
      })
      .mockRejectedValueOnce(new Error('rede indisponível'))

    render(<ImportarPedido limiteAcompanhamentoMs={3_000} />)
    await iniciar()

    expect(screen.getByText('Processando')).toBeInTheDocument()
    await avancar(1_500)

    expect(screen.getByText('Não foi possível consultar o andamento')).toBeInTheDocument()
    expect(screen.getByText(/pode continuar em andamento/)).toBeInTheDocument()
    expect(screen.queryByText('Importação falhou')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Consultar andamento' })).toBeInTheDocument()

    await avancar(10_000)
    expect(mocks.apiGet).toHaveBeenCalledTimes(2)
  })

  it('limpa o acompanhamento ao desmontar', async () => {
    mocks.apiGet.mockResolvedValue({
      jobId: 'job_1',
      orderId: null,
      status: 'RUNNING',
      events: [],
    })

    const { unmount } = render(<ImportarPedido />)
    await iniciar()

    expect(mocks.apiGet).toHaveBeenCalledTimes(1)

    unmount()
    await avancar(10_000)

    expect(mocks.apiGet).toHaveBeenCalledTimes(1)
  })

  it('mantém o limite padrão conservador de 60s', async () => {
    const modulo = await import('./importar-pedido')

    expect(modulo.LIMITE_ACOMPANHAMENTO_PADRAO_MS).toBe(60_000)
  })
})
