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

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
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
      producaoPorSetor: [{ sectorId: 'setor-corte', unidade: 'M', quantidade: '12.5' }],
      cumprimentoPrazo: { concluidasComPrazo: 4, concluidasNoPrazo: 3, percentual: 75 },
    },
  }
}

const ALERTAS_VAZIO = {
  alertas: { atrasados: [], parados: [], naoEncaminhados: [] },
}

const OCORRENCIAS_VAZIO = {
  resumo: { total: 0, ultimos7Dias: 0, porTipo: [], recentes: [] },
}

/** Responde por rota, já que o painel busca indicadores, alertas e ocorrências em paralelo. */
function mockRespostas(
  indicadoresPayload: unknown = indicadores(),
  alertasPayload: unknown = ALERTAS_VAZIO,
  ocorrenciasPayload: unknown = OCORRENCIAS_VAZIO,
) {
  mocks.apiGet.mockImplementation((path: string) => {
    if (path === '/api/indicadores') return Promise.resolve(indicadoresPayload)
    if (path === '/api/indicadores/alertas') return Promise.resolve(alertasPayload)
    if (path === '/api/indicadores/ocorrencias') return Promise.resolve(ocorrenciasPayload)
    return Promise.reject(new Error(`url inesperada: ${path}`))
  })
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
    mockRespostas()
    render(<PainelPage />)

    expect(await screen.findByText('setor-corte: 3')).toBeInTheDocument()
    expect(screen.getByText('setor-telhas: 1')).toBeInTheDocument()
    expect(screen.getByText('Pendente')).toBeInTheDocument()
    expect(screen.getByText('Total: 2')).toBeInTheDocument()
    expect(screen.getByText('Pendências').closest('div.rounded-card')).toHaveTextContent('2')
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/indicadores')
  })

  it('mostra a produção por setor e o cumprimento de prazo (FEP-02)', async () => {
    mockRespostas()
    render(<PainelPage />)

    expect(await screen.findByText('12,50 M')).toBeInTheDocument()
    expect(screen.getByText('75%')).toBeInTheDocument()
    expect(screen.getByText('3 de 4 no prazo.')).toBeInTheDocument()
  })

  it('mostra a produção de unidades diferentes do mesmo setor em linhas separadas (RN01, RN02)', async () => {
    mockRespostas({
      ...indicadores(),
      pcp: {
        producaoPorSetor: [
          { sectorId: 'setor-corte', unidade: 'UN', quantidade: '30' },
          { sectorId: 'setor-corte', unidade: 'M', quantidade: '15' },
        ],
        cumprimentoPrazo: { concluidasComPrazo: 0, concluidasNoPrazo: 0, percentual: 0 },
      },
    })
    render(<PainelPage />)

    expect(await screen.findByText('30 UN')).toBeInTheDocument()
    expect(screen.getByText('15,00 M')).toBeInTheDocument()
    expect(screen.queryByText(/45/)).not.toBeInTheDocument()
    // Sem denominador não há percentual: "0%" seria lido como desempenho ruim (P04).
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Sem concluídas com prazo.')).toBeInTheDocument()
  })

  it('mostra os alertas operacionais com atrasados, parados e não encaminhados (IND-11)', async () => {
    mockRespostas(indicadores(), {
      alertas: {
        atrasados: [
          {
            tipo: 'ATRASADO',
            orderId: 'o1',
            orderNumber: '1001',
            itemId: 'i1',
            itemDescription: 'Telha',
            sectorName: 'Telhas',
            detail: 'Prazo vencido em 05/01/2026',
          },
        ],
        parados: [],
        naoEncaminhados: [],
      },
    })
    render(<PainelPage />)

    expect(await screen.findByText('Alertas operacionais')).toBeInTheDocument()
    expect(screen.getByText('Atrasados')).toBeInTheDocument()
    expect(screen.getByText('Parados')).toBeInTheDocument()
    expect(screen.getByText('Não encaminhados')).toBeInTheDocument()
    expect(screen.getByText('Pedido 1001')).toBeInTheDocument()
  })

  it('mostra as ocorrências recentes com pedido, responsável e data (OCO-07)', async () => {
    mockRespostas(indicadores(), ALERTAS_VAZIO, {
      resumo: {
        total: 2,
        ultimos7Dias: 1,
        porTipo: [
          { tipo: 'PERDA', total: 1 },
          { tipo: 'REFUGO', total: 1 },
        ],
        recentes: [
          {
            id: 'o1',
            tipo: 'PERDA',
            quantidade: '2',
            observacao: 'Peça trincada',
            occurredAt: '2026-10-25T12:00:00.000Z',
            motivo: 'Defeito de corte',
            pedido: '82269',
            item: 'Perfil UE',
            setor: 'Corte e Dobra',
            usuario: 'Operador',
          },
        ],
      },
    })
    render(<PainelPage />)

    expect(await screen.findByText('Ocorrências recentes')).toBeInTheDocument()
    expect(screen.getByText('2 no total')).toBeInTheDocument()
    expect(screen.getByText('1 nos últimos 7 dias')).toBeInTheDocument()
    expect(screen.getByText('Pedido 82269 · Perfil UE')).toBeInTheDocument()
    expect(screen.getByText(/Responsável: Operador/)).toBeInTheDocument()
    expect(screen.getByText(/Defeito de corte/)).toBeInTheDocument()
  })

  it('rotula o status com texto, sem depender apenas de cor (FEP-01)', async () => {
    mockRespostas()
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
    let falhar = true
    mocks.apiGet.mockImplementation((path: string) => {
      if (falhar) return Promise.reject(new Error('falha'))
      if (path === '/api/indicadores') return Promise.resolve(indicadores())
      if (path === '/api/indicadores/alertas') return Promise.resolve(ALERTAS_VAZIO)
      return Promise.resolve(OCORRENCIAS_VAZIO)
    })
    render(<PainelPage />)

    const botao = await screen.findByRole('button', { name: 'Tentar de novo' })
    falhar = false
    fireEvent.click(botao)

    expect(await screen.findByText('setor-corte: 3')).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/indicadores/alertas')
  })

  it('usa o cabeçalho de página com o título do painel (VIS-09)', async () => {
    mockRespostas()
    render(<PainelPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Painel' })).toBeInTheDocument()
  })

  it('mostra métricas de produção e o progresso por setor (PROT-05)', async () => {
    mockRespostas()
    render(<PainelPage />)

    expect(await screen.findByText('Concluídas')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', { name: 'Produção do setor setor-corte' }),
    ).toBeInTheDocument()
  })

  it('mantém o resto do painel quando apenas as ocorrências falham (P08)', async () => {
    mocks.apiGet.mockImplementation((path: string) => {
      if (path === '/api/indicadores') return Promise.resolve(indicadores())
      if (path === '/api/indicadores/alertas') return Promise.resolve(ALERTAS_VAZIO)
      return Promise.reject(new Error('falha'))
    })
    render(<PainelPage />)

    expect(await screen.findByText('Pendências')).toBeInTheDocument()
    expect(await screen.findByText('Não foi possível carregar as ocorrências')).toBeInTheDocument()
  })

  it('mostra o horário da última atualização e permite atualizar (P08)', async () => {
    mockRespostas()
    render(<PainelPage />)

    expect(await screen.findByText(/Atualizado às/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument()
  })
})
