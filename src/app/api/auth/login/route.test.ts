import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { RoleCode, UserStatus } from '@/generated/prisma/client'

const mocks = vi.hoisted(() => {
  interface UsuarioAuthRow {
    id: string
    email: string
    passwordHash: string
    status: UserStatus
    roles: RoleCode[]
  }

  const usuarios: UsuarioAuthRow[] = []

  const authRepo = {
    buscarPorEmail: async (email: string) => {
      const found = usuarios.find((usuario) => usuario.email === email)
      return found ? { ...found, roles: [...found.roles] } : null
    },
  }

  return { usuarios, authRepo }
})

vi.mock('../../../../modules/auth/adapters/prisma-auth-repository', () => ({
  prismaAuthRepository: mocks.authRepo,
}))

import { hashSenha } from '../../../../modules/auth/senha'
import { verificarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import { POST } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function request(body: unknown): Request {
  return new Request('http://localhost/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function cookieDaResposta(response: Response): string {
  return response.headers.get('set-cookie') ?? ''
}

function tokenDoCookie(response: Response): string {
  const primeiro = cookieDaResposta(response).split(';')[0] ?? ''
  return primeiro.startsWith(`${SESSION_COOKIE}=`) ? primeiro.slice(SESSION_COOKIE.length + 1) : ''
}

async function seedUsuario(opts: {
  id?: string
  email: string
  senha: string
  status?: UserStatus
  roles?: RoleCode[]
}) {
  mocks.usuarios.push({
    id: opts.id ?? 'user_1',
    email: opts.email,
    passwordHash: await hashSenha(opts.senha),
    status: opts.status ?? 'ACTIVE',
    roles: opts.roles ?? ['OPERATOR'],
  })
}

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
    mocks.usuarios.length = 0
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('responde 200 e entrega a sessão em cookie httpOnly (AUTH-01, AUTH-06)', async () => {
    await seedUsuario({ email: 'ana@example.com', senha: 'senha-certa' })

    const response = await POST(request({ email: 'ana@example.com', senha: 'senha-certa' }))

    expect(response.status).toBe(200)
    const setCookie = cookieDaResposta(response)
    expect(setCookie).toContain(`${SESSION_COOKIE}=`)
    expect(setCookie).toContain('HttpOnly')
    expect(setCookie).toContain('Path=/')
    expect(setCookie).toContain('SameSite=Lax')

    const body = await response.json()
    expect(body.usuario.id).toBe('user_1')
    expect(verificarSessao(tokenDoCookie(response))?.userId).toBe('user_1')
  })

  it('responde 401 com senha incorreta e não emite cookie (AUTH-02)', async () => {
    await seedUsuario({ email: 'ana@example.com', senha: 'senha-certa' })

    const response = await POST(request({ email: 'ana@example.com', senha: 'senha-errada' }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('invalid_credentials')
    expect(cookieDaResposta(response)).toBe('')
  })

  it('responde 401 com email inexistente (AUTH-02)', async () => {
    const response = await POST(request({ email: 'ninguem@example.com', senha: 'senha-certa' }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('invalid_credentials')
    expect(cookieDaResposta(response)).toBe('')
  })

  it('responde 401 quando o usuário está inativo (AUTH-15)', async () => {
    await seedUsuario({ email: 'ana@example.com', senha: 'senha-certa', status: 'INACTIVE' })

    const response = await POST(request({ email: 'ana@example.com', senha: 'senha-certa' }))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('invalid_credentials')
    expect(cookieDaResposta(response)).toBe('')
  })

  it('responde 400 com corpo inválido e não emite cookie', async () => {
    const response = await POST(request({ email: '', senha: '' }))

    expect(response.status).toBe(400)
    expect((await response.json()).error).toBe('invalid_body')
    expect(cookieDaResposta(response)).toBe('')
  })
})
