import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessaoVerificada {
  userId: string
  expiraEm: Date
}

interface SessaoPayload {
  sub: string
  /** Expiração em epoch milissegundos. */
  exp: number
}

function segredo(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET não configurada')
  return secret
}

function assinar(payloadBase64: string, secret: string): string {
  return createHmac('sha256', secret).update(payloadBase64).digest('base64url')
}

/** Assina um token de sessão `payload.assinatura` (HMAC-SHA256) com expiração (AUTH-06). */
export function assinarSessao(input: { userId: string; expiraEm: Date }): string {
  const payload: SessaoPayload = { sub: input.userId, exp: input.expiraEm.getTime() }
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${payloadBase64}.${assinar(payloadBase64, segredo())}`
}

/**
 * Verifica o token de sessão. Retorna `null` quando o token está ausente, malformado,
 * adulterado ou expirado (AUTH-06, AUTH-16). Falha se `SESSION_SECRET` não existir.
 */
export function verificarSessao(token: string | null | undefined): SessaoVerificada | null {
  if (!token) return null

  const [payloadBase64, assinatura] = token.split('.')
  if (!payloadBase64 || !assinatura) return null

  const esperada = assinar(payloadBase64, segredo())
  const recebida = Buffer.from(assinatura)
  const calculada = Buffer.from(esperada)
  if (recebida.length !== calculada.length || !timingSafeEqual(recebida, calculada)) return null

  let payload: SessaoPayload
  try {
    payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8')) as SessaoPayload
  } catch {
    return null
  }

  if (typeof payload.sub !== 'string' || typeof payload.exp !== 'number') return null
  if (payload.exp <= Date.now()) return null

  return { userId: payload.sub, expiraEm: new Date(payload.exp) }
}
