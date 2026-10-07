import type { RoleCode, UserStatus } from '@/generated/prisma/client'
import { verificarSenha } from './senha'
import { assinarSessao } from './sessao'

export interface UsuarioAuth {
  id: string
  email: string
  passwordHash: string
  status: UserStatus
  roles: RoleCode[]
}

export interface AuthRepository {
  /** Busca o usuário pelo email (normalizado) com perfis e status, ou null. */
  buscarPorEmail(email: string): Promise<UsuarioAuth | null>
}

/** Mesma falha para email inexistente, senha incorreta e usuário inativo (AUTH-02, AUTH-15). */
export class CredenciaisInvalidasError extends Error {
  constructor() {
    super('Credenciais inválidas')
    this.name = 'CredenciaisInvalidasError'
  }
}

export interface AutenticarInput {
  email: string
  senha: string
}

export interface SessaoEmitida {
  token: string
  userId: string
  expiraEm: Date
}

export interface AutenticarOpcoes {
  agora?: Date
  duracaoMs?: number
}

const DURACAO_PADRAO_MS = 8 * 60 * 60 * 1000

/**
 * Valida as credenciais e emite a sessão assinada (AUTH-01, AUTH-02, AUTH-15).
 * Usuário inativo e credenciais inválidas produzem a mesma falha.
 */
export async function autenticar(
  input: AutenticarInput,
  repo: AuthRepository,
  opcoes: AutenticarOpcoes = {},
): Promise<SessaoEmitida> {
  const email = input.email.trim().toLowerCase()
  const usuario = await repo.buscarPorEmail(email)

  if (!usuario) throw new CredenciaisInvalidasError()
  if (usuario.status !== 'ACTIVE') throw new CredenciaisInvalidasError()

  const senhaConfere = await verificarSenha(input.senha, usuario.passwordHash)
  if (!senhaConfere) throw new CredenciaisInvalidasError()

  const agora = opcoes.agora ?? new Date()
  const expiraEm = new Date(agora.getTime() + (opcoes.duracaoMs ?? DURACAO_PADRAO_MS))
  const token = assinarSessao({ userId: usuario.id, expiraEm })

  return { token, userId: usuario.id, expiraEm }
}
