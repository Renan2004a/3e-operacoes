import { CredenciaisInvalidasError, autenticar } from '../../../../modules/auth/autenticar'
import { prismaAuthRepository } from '../../../../modules/auth/adapters/prisma-auth-repository'
import { serializarCookieSessao } from '../../../../shared/http/auth-context'

interface LoginBody {
  email?: unknown
  senha?: unknown
}

/**
 * POST /api/auth/login — valida as credenciais e emite a sessão em cookie
 * httpOnly (AUTH-01, AUTH-02, AUTH-06, AUTH-15). Credenciais inválidas e
 * usuário inativo respondem `401` sem distinguir o motivo.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const campos: LoginBody = typeof body === 'object' && body !== null ? (body as LoginBody) : {}
  if (
    typeof campos.email !== 'string' ||
    typeof campos.senha !== 'string' ||
    campos.email.trim() === '' ||
    campos.senha === ''
  ) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const sessao = await autenticar(
      { email: campos.email, senha: campos.senha },
      prismaAuthRepository,
    )
    const maxAge = Math.floor((sessao.expiraEm.getTime() - Date.now()) / 1000)
    return Response.json(
      { usuario: { id: sessao.userId } },
      {
        status: 200,
        headers: { 'Set-Cookie': serializarCookieSessao(sessao.token, maxAge) },
      },
    )
  } catch (error) {
    if (error instanceof CredenciaisInvalidasError) {
      return Response.json({ error: 'invalid_credentials' }, { status: 401 })
    }
    throw error
  }
}
