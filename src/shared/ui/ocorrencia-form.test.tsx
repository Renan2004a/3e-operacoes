// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

const mocks = vi.hoisted(() => ({ apiGet: vi.fn(), apiPost: vi.fn() }))

vi.mock('@/shared/http/api-client', () => ({
  apiGet: mocks.apiGet,
  apiPost: mocks.apiPost,
  apiPatch: vi.fn(),
  ApiError: class ApiError extends Error {},
}))

import { OcorrenciaForm } from './ocorrencia-form'

const MOTIVO_PERDA = {
  id: 'm1',
  tipo: 'PERDA',
  codigo: 'DEFEITO_CORTE',
  descricao: 'Defeito de corte',
  ativo: true,
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

describe('OcorrenciaForm', () => {
  it('renderiza o tipo de ocorrência com rótulo, começando em Perda (FE-11)', () => {
    mocks.apiGet.mockResolvedValue({ motivos: [] })
    render(<OcorrenciaForm atividadeId="atv_1" />)

    expect(screen.getByLabelText('Tipo de ocorrência')).toHaveValue('PERDA')
    expect(screen.getByLabelText('Motivo')).toBeInTheDocument()
  })

  it('busca os motivos na lista fechada da API para perda (FE-12)', async () => {
    mocks.apiGet.mockResolvedValue({ motivos: [MOTIVO_PERDA] })
    render(<OcorrenciaForm atividadeId="atv_1" />)

    expect(await screen.findByRole('option', { name: 'Defeito de corte' })).toBeInTheDocument()
    expect(mocks.apiGet).toHaveBeenCalledWith('/api/motivos?tipo=PERDA')
  })

  it('bloqueia o envio de perda sem motivo e mostra erro acessível (FE-11)', async () => {
    mocks.apiGet.mockResolvedValue({ motivos: [MOTIVO_PERDA] })
    render(<OcorrenciaForm atividadeId="atv_1" />)

    await screen.findByRole('option', { name: 'Defeito de corte' })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/escolha o motivo/i)
    expect(mocks.apiPost).not.toHaveBeenCalled()
  })

  it('registra a ocorrência com o motivo escolhido e confirma (FE-11)', async () => {
    const onRegistrada = vi.fn()
    mocks.apiGet.mockResolvedValue({ motivos: [MOTIVO_PERDA] })
    mocks.apiPost.mockResolvedValue({ ocorrencia: { id: 'o1' } })
    render(<OcorrenciaForm atividadeId="atv_1" onRegistrada={onRegistrada} />)

    await screen.findByRole('option', { name: 'Defeito de corte' })
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'm1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }))

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(1))
    expect(mocks.apiPost).toHaveBeenCalledWith(
      '/api/producao/atividades/atv_1/ocorrencias',
      expect.objectContaining({ tipo: 'PERDA', motivoId: 'm1' }),
    )
    expect(await screen.findByText('Ocorrência registrada')).toBeInTheDocument()
    expect(onRegistrada).toHaveBeenCalledTimes(1)
  })

  it('para um tipo sem motivo não busca motivos nem exige seleção (FE-11)', async () => {
    mocks.apiGet.mockResolvedValue({ motivos: [] })
    mocks.apiPost.mockResolvedValue({})
    render(<OcorrenciaForm atividadeId="atv_1" />)

    fireEvent.change(screen.getByLabelText('Tipo de ocorrência'), { target: { value: 'PAUSA' } })
    await waitFor(() => expect(screen.queryByLabelText('Motivo')).not.toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Registrar ocorrência' }))

    await waitFor(() => expect(mocks.apiPost).toHaveBeenCalledTimes(1))
    const corpo = mocks.apiPost.mock.calls[0]?.[1] as { tipo: string; motivoId?: unknown }
    expect(corpo.tipo).toBe('PAUSA')
    expect(corpo.motivoId).toBeUndefined()
    expect(mocks.apiGet).toHaveBeenCalledTimes(1)
  })

  it('mostra erro acessível quando os motivos não carregam (FE-14)', async () => {
    mocks.apiGet.mockRejectedValue(new Error('falha'))
    render(<OcorrenciaForm atividadeId="atv_1" />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os motivos/i)
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })
})
