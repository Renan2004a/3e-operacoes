import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  CredenciaisInvalidasError,
  autenticar,
  type AuthRepository,
} from '@/modules/auth/autenticar'
import { verificarSenha } from '@/modules/auth/senha'
import {
  EmailJaExisteError,
  UsuarioNaoEncontradoError,
  atualizarUsuario,
  criarUsuario,
  inativarUsuario,
  type Usuario,
  type UsuariosRepository,
} from './gerenciar-usuarios'

const ORIGINAL = process.env.SESSION_SECRET

beforeEach(() => {
  process.env.SESSION_SECRET = 'segredo-de-teste'
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = ORIGINAL
})

function usuario(overrides: Partial<Usuario> & Pick<Usuario, 'email'>): Usuario {
  const base: Usuario = {
    id: 'user_1',
    name: 'Usuário',
    email: overrides.email,
    status: 'ACTIVE',
    roles: [],
    sectorIds: [],
    createdAt: new Date('2026-10-07T12:00:00.000Z'),
    updatedAt: new Date('2026-10-07T12:00:00.000Z'),
  }
  return { ...base, ...overrides }
}

function criarRepo(seed: { usuarios?: Usuario[]; hashes?: Record<string, string> } = {}) {
  const usuarios = [...(seed.usuarios ?? [])]
  const hashes = new Map<string, string>(Object.entries(seed.hashes ?? {}))
  let seq = usuarios.length

  const repo: UsuariosRepository = {
    async findByEmail(email) {
      return usuarios.find((candidate) => candidate.email === email) ?? null
    },
    async findById(id) {
      return usuarios.find((candidate) => candidate.id === id) ?? null
    },
    async create(input) {
      seq += 1
      const now = new Date()
      const created: Usuario = {
        id: `user_${seq}`,
        name: input.name,
        email: input.email,
        status: 'ACTIVE',
        roles: [...input.roles],
        sectorIds: [...input.sectorIds],
        createdAt: now,
        updatedAt: now,
      }
      usuarios.push(created)
      hashes.set(created.id, input.passwordHash)
      return created
    },
    async update(id, input) {
      const found = usuarios.find((candidate) => candidate.id === id)
      if (!found) throw new Error('usuário não encontrado')
      if (input.name !== undefined) found.name = input.name
      if (input.status !== undefined) found.status = input.status
      if (input.roles !== undefined) found.roles = [...input.roles]
      if (input.sectorIds !== undefined) found.sectorIds = [...input.sectorIds]
      if (input.passwordHash !== undefined) hashes.set(id, input.passwordHash)
      found.updatedAt = new Date()
      return found
    },
    async deactivate(id) {
      const found = usuarios.find((candidate) => candidate.id === id)
      if (!found) throw new Error('usuário não encontrado')
      found.status = 'INACTIVE'
      return found
    },
  }

  return { repo, usuarios, hashes }
}

function authRepoDe(repo: UsuariosRepository, hashes: Map<string, string>): AuthRepository {
  return {
    async buscarPorEmail(email) {
      const found = await repo.findByEmail(email)
      if (!found) return null
      return {
        id: found.id,
        email: found.email,
        passwordHash: hashes.get(found.id) ?? '',
        status: found.status,
        roles: found.roles,
      }
    },
  }
}

describe('criarUsuario', () => {
  it('persiste a senha apenas como hash', async () => {
    const { repo, hashes } = criarRepo()

    const created = await criarUsuario(
      { name: 'Ana', email: 'ana@example.com', senha: 'senha-certa' },
      repo,
    )

    const hash = hashes.get(created.id)
    expect(hash).toBeDefined()
    expect(hash).not.toBe('senha-certa')
    expect(hash?.includes('senha-certa')).toBe(false)
    await expect(verificarSenha('senha-certa', hash ?? '')).resolves.toBe(true)
  })

  it('rejeita email duplicado com conflito, ignorando caixa', async () => {
    const { repo } = criarRepo({ usuarios: [usuario({ email: 'ana@example.com' })] })

    await expect(
      criarUsuario({ name: 'Outra', email: '  Ana@Example.com ', senha: 'x' }, repo),
    ).rejects.toBeInstanceOf(EmailJaExisteError)
  })

  it('persiste perfis e setores N:N', async () => {
    const { repo } = criarRepo()

    const created = await criarUsuario(
      {
        name: 'Ana',
        email: 'ana@example.com',
        senha: 'senha-certa',
        roles: ['OPERATOR', 'SHIPPING'],
        sectorIds: ['setor_telhas', 'setor_corte'],
      },
      repo,
    )

    expect(created.roles).toEqual(['OPERATOR', 'SHIPPING'])
    expect(created.sectorIds).toEqual(['setor_telhas', 'setor_corte'])
  })
})

describe('atualizarUsuario', () => {
  it('atualiza perfis e setores', async () => {
    const { repo } = criarRepo({ usuarios: [usuario({ id: 'user_1', email: 'ana@example.com' })] })

    const updated = await atualizarUsuario(
      'user_1',
      { roles: ['SYSTEM_RESPONSIBLE'], sectorIds: ['setor_revenda'] },
      repo,
    )

    expect(updated.roles).toEqual(['SYSTEM_RESPONSIBLE'])
    expect(updated.sectorIds).toEqual(['setor_revenda'])
  })

  it('re-hasheia a senha quando informada', async () => {
    const { repo, hashes } = criarRepo({
      usuarios: [usuario({ id: 'user_1', email: 'ana@example.com' })],
      hashes: { user_1: 'hash-antigo' },
    })

    await atualizarUsuario('user_1', { senha: 'nova-senha' }, repo)

    const hash = hashes.get('user_1')
    expect(hash).not.toBe('hash-antigo')
    await expect(verificarSenha('nova-senha', hash ?? '')).resolves.toBe(true)
    await expect(verificarSenha('senha-certa', hash ?? '')).resolves.toBe(false)
  })

  it('rejeita usuário inexistente', async () => {
    const { repo } = criarRepo()

    await expect(
      atualizarUsuario('user_x', { name: 'Ninguém' }, repo),
    ).rejects.toBeInstanceOf(UsuarioNaoEncontradoError)
  })
})

describe('inativarUsuario', () => {
  it('marca o usuário como inativo sem removê-lo', async () => {
    const { repo, usuarios } = criarRepo({
      usuarios: [usuario({ id: 'user_1', email: 'ana@example.com' })],
    })

    const inativado = await inativarUsuario('user_1', repo)

    expect(inativado.status).toBe('INACTIVE')
    expect(usuarios).toHaveLength(1)
  })

  it('impede o login do usuário inativado', async () => {
    const { repo, hashes } = criarRepo()
    const created = await criarUsuario(
      { name: 'Ana', email: 'ana@example.com', senha: 'senha-certa' },
      repo,
    )
    const authRepo = authRepoDe(repo, hashes)

    await expect(
      autenticar({ email: 'ana@example.com', senha: 'senha-certa' }, authRepo),
    ).resolves.toBeDefined()

    await inativarUsuario(created.id, repo)

    await expect(
      autenticar({ email: 'ana@example.com', senha: 'senha-certa' }, authRepo),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError)
  })
})
