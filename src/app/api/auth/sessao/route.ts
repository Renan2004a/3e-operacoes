import { obterUsuario, serializarCookieSessaoExpirado } from '../../../../shared/http/auth-context'

/**
 * GET /api/auth/sessao — devolve o usuário da sessão (AUTH-04). Sem sessão
 * válida responde `401`, cobrindo também token adulterado ou expirado (AUTH-16).
 */
export async function GET(request: Request) {
  const usuario = obterUsuario(request)
  if (!usuario) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  return Response.json(
    { usuario: { id: usuario.userId, expiraEm: usuario.expiraEm } },
    { status: 200 },
  )
}

/**
 * DELETE /api/auth/sessao — encerra a sessão limpando o cookie httpOnly
 * (AUTH-03). Logout é idempotente: sem sessão também limpa o cookie.
 */
export async function DELETE() {
  return Response.json(
    { ok: true },
    { status: 200, headers: { 'Set-Cookie': serializarCookieSessaoExpirado() } },
  )
}
