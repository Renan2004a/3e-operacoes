import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { assinarSessao } from '@/modules/auth/sessao'
import {
  NaoAutenticadoError,
  SemPermissaoError,
  SESSION_COOKIE,
  exigirPerfil,
  obterUsuario,
  type AuthRequest,
  type ExigirPerfilDeps,
} from './auth-context'

const ORIGINAL = process.env.SESSION_SECRET

beforeEach(() => {
  process.env.SESSION_SECRET = 'segredo-de-teste'
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = ORIGINAL
})

function request(cookie?: string): AuthRequest {
  return {
    headers: {
      get: (name) => (name.toLowerCase() === 'cookie' ? (cookie ?? null) : null),
    },
  }
}

function tokenValido(userId = 'user_1'): string {
  return assinarSessao({ userId, expiraEm: new Date(Date.now() + 60_000) })
}

const deps: ExigirPerfilDeps = {
  async carregarPerfis(userId) {
    return userId === 'user_1' ? ['OPERATOR'] : []
  },
  pode(perfis, acao) {
    return acao === 'registrar_execucao' && perfis.includes('OPERATOR')
  },
}

describe('obterUsuario', () => {
  it('sem sessão, retorna null e exigirPerfil não autoriza', async () => {
    expect(obterUsuario(request())).toBeNull()
    await expect(exigirPerfil(request(), 'registrar_execucao', deps)).rejects.toBeInstanceOf(
      NaoAutenticadoError,
    )
  })

  it('com token válido, expõe o usuário da sessão', () => {
    const usuario = obterUsuario(request(`outro=1; ${SESSION_COOKIE}=${tokenValido()}`))

    expect(usuario?.userId).toBe('user_1')
  })

  it('rejeita token adulterado', () => {
    expect(obterUsuario(request(`${SESSION_COOKIE}=token-adulterado`))).toBeNull()
  })
})

describe('exigirPerfil', () => {
  it('retorna o usuário quando o perfil permite a ação', async () => {
    const usuario = await exigirPerfil(
      request(`${SESSION_COOKIE}=${tokenValido()}`),
      'registrar_execucao',
      deps,
    )

    expect(usuario.userId).toBe('user_1')
  })

  it('lança SemPermissaoError quando o perfil não pode a ação', async () => {
    await expect(
      exigirPerfil(request(`${SESSION_COOKIE}=${tokenValido()}`), 'gerenciar_usuarios', deps),
    ).rejects.toBeInstanceOf(SemPermissaoError)
  })
})
