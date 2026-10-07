import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assinarSessao } from '../../../../modules/auth/sessao'
import { SESSION_COOKIE } from '../../../../shared/http/auth-context'
import { DELETE, GET } from './route'

const ORIGINAL_SECRET = process.env.SESSION_SECRET

function tokenValido(userId = 'user_1'): string {
  return assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
}

function getRequest(cookie?: string): Request {
  return new Request('http://localhost/api/auth/sessao', {
    method: 'GET',
    headers: cookie === undefined ? {} : { cookie },
  })
}

function cookieDaResposta(response: Response): string {
  return response.headers.get('set-cookie') ?? ''
}

describe('/api/auth/sessao', () => {
  beforeEach(() => {
    process.env.SESSION_SECRET = 'segredo-de-teste'
  })

  afterEach(() => {
    if (ORIGINAL_SECRET === undefined) delete process.env.SESSION_SECRET
    else process.env.SESSION_SECRET = ORIGINAL_SECRET
  })

  it('GET responde 200 com o usuário da sessão (AUTH-04)', async () => {
    const response = await GET(getRequest(`${SESSION_COOKIE}=${tokenValido()}`))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.usuario.id).toBe('user_1')
  })

  it('GET responde 401 sem sessão (AUTH-04)', async () => {
    const response = await GET(getRequest())

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('GET responde 401 com token adulterado (AUTH-16)', async () => {
    const response = await GET(getRequest(`${SESSION_COOKIE}=token-adulterado`))

    expect(response.status).toBe(401)
    expect((await response.json()).error).toBe('unauthorized')
  })

  it('DELETE responde 200 e expira o cookie de sessão (AUTH-03)', async () => {
    const response = await DELETE()

    expect(response.status).toBe(200)
    const setCookie = cookieDaResposta(response)
    expect(setCookie).toContain(`${SESSION_COOKIE}=;`)
    expect(setCookie).toContain('Max-Age=0')
    expect(setCookie).toContain('HttpOnly')
  })

  it('após o logout o cookie não autentica mais (AUTH-03)', async () => {
    const logout = await DELETE()
    const cookieExpirado = cookieDaResposta(logout).split(';')[0] ?? ''

    const response = await GET(getRequest(cookieExpirado))

    expect(response.status).toBe(401)
  })
})
