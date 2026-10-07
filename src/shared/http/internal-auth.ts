export interface InternalAuthRequest {
  headers: { get(name: string): string | null }
}

/**
 * Guarda temporária das rotas de integração enquanto a feature de autenticação
 * não existe. Compara o header `Authorization: Bearer <token>` com
 * `APP_INTERNAL_TOKEN`.
 */
export function requireInternalToken(request: InternalAuthRequest): boolean {
  const expected = process.env.APP_INTERNAL_TOKEN
  if (!expected) return false

  const header = request.headers.get('authorization')
  if (!header) return false

  const match = /^Bearer\s+(.+)$/i.exec(header.trim())
  return match?.[1] === expected
}
