import type { RoleCode, UserStatus } from '@/generated/prisma/client'
import { hashSenha } from '@/modules/auth/senha'

export interface Usuario {
  id: string
  name: string
  email: string
  status: UserStatus
  roles: RoleCode[]
  sectorIds: string[]
  createdAt: Date
  updatedAt: Date
}

export interface CriarUsuarioPersistencia {
  name: string
  email: string
  passwordHash: string
  roles: RoleCode[]
  sectorIds: string[]
}

export interface AtualizarUsuarioPersistencia {
  name?: string
  passwordHash?: string
  status?: UserStatus
  roles?: RoleCode[]
  sectorIds?: string[]
}

export interface UsuariosRepository {
  findByEmail(email: string): Promise<Usuario | null>
  findById(id: string): Promise<Usuario | null>
  create(input: CriarUsuarioPersistencia): Promise<Usuario>
  update(id: string, input: AtualizarUsuarioPersistencia): Promise<Usuario>
  deactivate(id: string): Promise<Usuario>
}

export class EmailJaExisteError extends Error {
  constructor(email: string) {
    super(`Email já cadastrado: ${email}`)
    this.name = 'EmailJaExisteError'
  }
}

export class UsuarioNaoEncontradoError extends Error {
  constructor(id: string) {
    super(`Usuário não encontrado: ${id}`)
    this.name = 'UsuarioNaoEncontradoError'
  }
}

export interface CriarUsuarioInput {
  name: string
  email: string
  senha: string
  roles?: RoleCode[]
  sectorIds?: string[]
}

/** Cria o usuário com a senha hasheada e as associações N:N (AUTH-10, AUTH-11, AUTH-12). */
export async function criarUsuario(
  input: CriarUsuarioInput,
  repo: UsuariosRepository,
): Promise<Usuario> {
  const name = input.name.trim()
  const email = input.email.trim().toLowerCase()

  const existente = await repo.findByEmail(email)
  if (existente) throw new EmailJaExisteError(email)

  const passwordHash = await hashSenha(input.senha)

  return repo.create({
    name,
    email,
    passwordHash,
    roles: input.roles ?? [],
    sectorIds: input.sectorIds ?? [],
  })
}

export interface AtualizarUsuarioInput {
  name?: string
  senha?: string
  status?: UserStatus
  roles?: RoleCode[]
  sectorIds?: string[]
}

/** Atualiza dados, perfis, setores e status; re-hasheia a senha quando informada (AUTH-12). */
export async function atualizarUsuario(
  id: string,
  input: AtualizarUsuarioInput,
  repo: UsuariosRepository,
): Promise<Usuario> {
  const atual = await repo.findById(id)
  if (!atual) throw new UsuarioNaoEncontradoError(id)

  const dados: AtualizarUsuarioPersistencia = {}
  if (input.name !== undefined) dados.name = input.name.trim()
  if (input.status !== undefined) dados.status = input.status
  if (input.roles !== undefined) dados.roles = input.roles
  if (input.sectorIds !== undefined) dados.sectorIds = input.sectorIds
  if (input.senha !== undefined) dados.passwordHash = await hashSenha(input.senha)

  return repo.update(id, dados)
}

/** Inativa o usuário sem removê-lo; o login passa a ser recusado (AUTH-13). */
export async function inativarUsuario(id: string, repo: UsuariosRepository): Promise<Usuario> {
  const atual = await repo.findById(id)
  if (!atual) throw new UsuarioNaoEncontradoError(id)

  return repo.deactivate(id)
}
