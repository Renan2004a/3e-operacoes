import type { RoleCode } from '@/generated/prisma/client'
import { verificarSessao } from '@/modules/auth/sessao'

export const SESSION_COOKIE = '3e_session'

export interface AuthRequest {
  headers: { get(name: string): string | null }
}

export interface SessaoUsuario {
  userId: string
  expiraEm: Date
}

/** Sessão ausente, inválida ou expirada (HTTP 401). */
export class NaoAutenticadoError extends Error {
  constructor() {
    super('Sessão ausente ou inválida')
    this.name = 'NaoAutenticadoError'
  }
}

/** Sessão válida, mas sem o perfil exigido para a ação (HTTP 403). */
export class SemPermissaoError extends Error {
  constructor(acao: string) {
    super(`Perfil sem permissão para a ação: ${acao}`)
    this.name = 'SemPermissaoError'
  }
}

/**
 * Dependências de autorização. A sessão carrega apenas o id do usuário; os perfis
 * vêm do banco e a matriz é aplicada por `pode` (módulo usuarios/permissoes).
 */
export interface ExigirPerfilDeps {
  carregarPerfis(userId: string): Promise<RoleCode[]>
  pode(perfis: RoleCode[], acao: string): boolean
}

/** Atributos comuns do cookie de sessão: httpOnly, mesmo site e escopo global (AUTH-06). */
function atributosCookie(): string {
  const seguro = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `; Path=/; HttpOnly; SameSite=Lax${seguro}`
}

/** Serializa o cookie de sessão httpOnly com validade em segundos (AUTH-06). */
export function serializarCookieSessao(token: string, maxAgeSegundos: number): string {
  return `${SESSION_COOKIE}=${token}${atributosCookie()}; Max-Age=${maxAgeSegundos}`
}

/** Serializa o cookie de sessão já expirado, encerrando a sessão no cliente (AUTH-03). */
export function serializarCookieSessaoExpirado(): string {
  return `${SESSION_COOKIE}=${atributosCookie()}; Max-Age=0`
}

function cookieSessao(request: AuthRequest): string | null {
  const header = request.headers.get('cookie')
  if (!header) return null

  for (const parte of header.split(';')) {
    const [nome, ...valor] = parte.trim().split('=')
    if (nome === SESSION_COOKIE) return valor.join('=') || null
  }
  return null
}

/** Lê o cookie de sessão e valida o token; null quando ausente ou inválido (AUTH-04). */
export function obterUsuario(request: AuthRequest): SessaoUsuario | null {
  const token = cookieSessao(request)
  if (!token) return null

  const sessao = verificarSessao(token)
  if (!sessao) return null

  return { userId: sessao.userId, expiraEm: sessao.expiraEm }
}

/**
 * Exige sessão válida e perfil autorizado para a ação (AUTH-04, AUTH-07, AUTH-08).
 *
 * SPEC_DEVIATION: `design.md` declara `exigirPerfil(request, acao)`; a assinatura
 * recebe `deps` (perfis + matriz) porque a sessão carrega apenas o id e o módulo
 * `usuarios/permissoes` (fase 2) ainda não existe nesta fase. O comportamento
 * observável (401 sem sessão, 403 sem perfil) é o mesmo.
 */
export async function exigirPerfil(
  request: AuthRequest,
  acao: string,
  deps: ExigirPerfilDeps,
): Promise<SessaoUsuario> {
  const usuario = obterUsuario(request)
  if (!usuario) throw new NaoAutenticadoError()

  const perfis = await deps.carregarPerfis(usuario.userId)
  if (!deps.pode(perfis, acao)) throw new SemPermissaoError(acao)

  return usuario
}
