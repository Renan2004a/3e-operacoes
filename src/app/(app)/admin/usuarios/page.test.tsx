// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'

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

vi.mock('next/navigation', () => ({
  useParams: () => ({}),
  useRouter: () => ({ push: vi.fn() }),
}))

import UsuariosPage from './page'

const SETOR = { id: 's1', code: 'CORTE', name: 'Corte e Dobra', active: true }
const USUARIO = {
  id: 'u1',
  name: 'Ana',
  email: 'ana@x.com',
  status: 'ACTIVE',
  roles: ['SELLER'],
  sectorIds: ['s1'],
}

function configurarApi(usuarios: unknown[] = []) {
  mocks.apiGet.mockImplementation((url: string) => {
    if (url === '/api/usuarios') return Promise.resolve({ usuarios })
    if (url === '/api/setores') return Promise.resolve({ sectors: [SETOR] })
    return Promise.reject(new Error(`url inesperada: ${url}`))
  })
}

function preencherFormulario() {
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Beto' } })
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'beto@x.com' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } })
}

beforeEach(() => {
  mocks.apiGet.mockReset()
  mocks.apiPost.mockReset()
})

afterEach(cleanup)

describe('UsuariosPage', () => {
  it('mostra o estado de carregando enquanto busca (FEP-08)', () => {
    mocks.apiGet.mockReturnValue(new Promise(() => {}))
    render(<UsuariosPage />)

    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('lista os usuários com perfis e setores (FEP-08)', async () => {
    configurarApi([USUARIO])
    render(<UsuariosPage />)

    const lista = await screen.findByRole('list', { name: 'Usuários' })
    expect(within(lista).getByText('Ana')).toBeInTheDocument()
    expect(within(lista).getByText('ana@x.com')).toBeInTheDocument()
    expect(within(lista).getByText('Vendedor')).toBeInTheDocument()
    expect(within(lista).getByText('Setores: Corte e Dobra')).toBeInTheDocument()
  })

  it('cria um usuário com perfis e setores (FEP-08)', async () => {
    configurarApi([])
    mocks.apiPost.mockResolvedValue({ usuario: USUARIO })
    render(<UsuariosPage />)

    await screen.findByRole('heading', { name: 'Novo usuário' })
    preencherFormulario()
    fireEvent.click(screen.getByLabelText('Vendedor'))
    fireEvent.click(screen.getByLabelText('Corte e Dobra'))
    fireEvent.click(screen.getByRole('button', { name: 'Criar usuário' }))

    await waitFor(() =>
      expect(mocks.apiPost).toHaveBeenCalledWith('/api/usuarios', {
        name: 'Beto',
        email: 'beto@x.com',
        senha: 'segredo',
        roles: ['SELLER'],
        sectorIds: ['s1'],
      }),
    )
  })

  it('trata o conflito de e-mail com mensagem acessível (FEP-08)', async () => {
    configurarApi([])
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(409, 'email_already_exists'))
    render(<UsuariosPage />)

    await screen.findByRole('heading', { name: 'Novo usuário' })
    preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Criar usuário' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/e-mail já cadastrado/i)
  })

  it('trata a falta de permissão com mensagem acessível (FEP-08)', async () => {
    configurarApi([])
    mocks.apiPost.mockRejectedValue(new mocks.ApiError(403, 'forbidden'))
    render(<UsuariosPage />)

    await screen.findByRole('heading', { name: 'Novo usuário' })
    preencherFormulario()
    fireEvent.click(screen.getByRole('button', { name: 'Criar usuário' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/sem permissão/i)
  })

  it('mostra erro acessível e permite tentar de novo quando a API falha (FEP-13)', async () => {
    mocks.apiGet
      .mockRejectedValueOnce(new Error('falha'))
      .mockRejectedValueOnce(new Error('falha'))
      .mockImplementation((url: string) => {
        if (url === '/api/usuarios') return Promise.resolve({ usuarios: [] })
        if (url === '/api/setores') return Promise.resolve({ sectors: [SETOR] })
        return Promise.reject(new Error('url inesperada'))
      })
    render(<UsuariosPage />)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/não foi possível carregar os usuários/i)

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(await screen.findByRole('heading', { name: 'Novo usuário' })).toBeInTheDocument()
  })

  it('usa o cabeçalho de página com o título (VIS-09)', async () => {
    configurarApi([])
    render(<UsuariosPage />)

    expect(await screen.findByRole('heading', { level: 1, name: 'Usuários' })).toBeInTheDocument()
  })
})
