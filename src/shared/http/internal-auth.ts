export interface InternalAuthRequest {
  headers: { get(name: string): string | null }
}

function bearerToken(request: InternalAuthRequest): string | null {
  const header = request.headers.get('authorization')
  if (!header) return null
  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] ?? null
}

/** Compara o header `Authorization: Bearer <token>` com o valor esperado. */
export function requireToken(request: InternalAuthRequest, expected: string | undefined): boolean {
  if (!expected) return false
  const token = bearerToken(request)
  return token !== null && token === expected
}

/**
 * Guarda temporária das rotas de usuário enquanto a feature de autenticação
 * não existe. Compara o header com `APP_INTERNAL_TOKEN`.
 */
export function requireInternalToken(request: InternalAuthRequest): boolean {
  return requireToken(request, process.env.APP_INTERNAL_TOKEN)
}

/**
 * Guarda do callback do conector (conector → app). Compara o header com
 * `CONNECTOR_CALLBACK_TOKEN`, separado do token das rotas de usuário.
 */
export function requireCallbackToken(request: InternalAuthRequest): boolean {
  return requireToken(request, process.env.CONNECTOR_CALLBACK_TOKEN)
}
