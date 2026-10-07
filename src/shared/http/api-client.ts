export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message?: string) {
    super(message ?? `Falha na requisição (${status}): ${code}`)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export interface ApiClientOptions {
  /**
   * Redireciona ao login em `401` (padrão). Desligue na própria tela de login,
   * onde `401` significa credenciais inválidas, não sessão expirada.
   */
  redirectOnUnauthorized?: boolean
}

/** Sessão expirada (FE-13): manda o usuário ao login. */
function redirecionarParaLogin(): void {
  if (typeof window !== 'undefined' && window.location) {
    window.location.assign('/login')
    return
  }
  const location = (globalThis as unknown as { location?: { assign?: (url: string) => void } })
    .location
  location?.assign?.('/login')
}

async function tratarResposta<T>(res: Response, redirectOnUnauthorized: boolean): Promise<T> {
  if (res.status === 401) {
    if (redirectOnUnauthorized) redirecionarParaLogin()
    throw new ApiError(401, 'unauthorized', 'Sessão expirada. Entre novamente.')
  }

  if (!res.ok) {
    let code = 'request_failed'
    try {
      const corpo = (await res.json()) as { error?: unknown }
      if (typeof corpo?.error === 'string') code = corpo.error
    } catch {
      // resposta sem corpo JSON; mantém o código genérico
    }
    throw new ApiError(res.status, code)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

async function requisitar<T>(
  method: string,
  path: string,
  body: unknown,
  options: ApiClientOptions,
): Promise<T> {
  const redirectOnUnauthorized = options.redirectOnUnauthorized ?? true

  let res: Response
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers:
        body === undefined
          ? { accept: 'application/json' }
          : { accept: 'application/json', 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError(0, 'network_error', 'Não foi possível conectar. Tente novamente.')
  }

  return tratarResposta<T>(res, redirectOnUnauthorized)
}

export function apiGet<T>(path: string, options: ApiClientOptions = {}): Promise<T> {
  return requisitar<T>('GET', path, undefined, options)
}

export function apiPost<T>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
  return requisitar<T>('POST', path, body, options)
}

export function apiPatch<T>(path: string, body: unknown, options: ApiClientOptions = {}): Promise<T> {
  return requisitar<T>('PATCH', path, body, options)
}
