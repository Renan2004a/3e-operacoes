import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  CredenciaisInvalidasError,
  autenticar,
  type AuthRepository,
  type UsuarioAuth,
} from './autenticar'
import { hashSenha } from './senha'
import { verificarSessao } from './sessao'

const ORIGINAL = process.env.SESSION_SECRET

beforeEach(() => {
  process.env.SESSION_SECRET = 'segredo-de-teste'
})

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SESSION_SECRET
  else process.env.SESSION_SECRET = ORIGINAL
})

let usuarioAtivo: UsuarioAuth

beforeAll(async () => {
  usuarioAtivo = {
    id: 'user_1',
    email: 'user@example.com',
    passwordHash: await hashSenha('senha-certa'),
    status: 'ACTIVE',
    roles: ['OPERATOR'],
  }
})

function repoDe(usuarios: UsuarioAuth[]): AuthRepository {
  return {
    async buscarPorEmail(email) {
      return usuarios.find((usuario) => usuario.email === email) ?? null
    },
  }
}

describe('autenticar', () => {
  it('emite uma sessão válida para credenciais corretas', async () => {
    const result = await autenticar(
      { email: '  User@Example.com ', senha: 'senha-certa' },
      repoDe([usuarioAtivo]),
    )

    expect(result.userId).toBe('user_1')
    expect(verificarSessao(result.token)?.userId).toBe('user_1')
  })

  it('define a expiração a partir da duração informada', async () => {
    const agora = new Date()

    const result = await autenticar(
      { email: 'user@example.com', senha: 'senha-certa' },
      repoDe([usuarioAtivo]),
      { agora, duracaoMs: 60_000 },
    )

    expect(result.expiraEm.getTime() - agora.getTime()).toBe(60_000)
  })

  it('rejeita senha incorreta', async () => {
    await expect(
      autenticar({ email: 'user@example.com', senha: 'errada' }, repoDe([usuarioAtivo])),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError)
  })

  it('rejeita email inexistente', async () => {
    await expect(
      autenticar({ email: 'nao-existe@example.com', senha: 'senha-certa' }, repoDe([usuarioAtivo])),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError)
  })

  it('rejeita usuário inativo', async () => {
    const inativo: UsuarioAuth = { ...usuarioAtivo, status: 'INACTIVE' }

    await expect(
      autenticar({ email: 'user@example.com', senha: 'senha-certa' }, repoDe([inativo])),
    ).rejects.toBeInstanceOf(CredenciaisInvalidasError)
  })

  it('usa a mesma mensagem de falha para não vazar a existência do usuário', async () => {
    const repo = repoDe([usuarioAtivo])
    const inativo = repoDe([{ ...usuarioAtivo, status: 'INACTIVE' }])

    const senhaErrada = await autenticar(
      { email: 'user@example.com', senha: 'errada' },
      repo,
    ).catch((erro: Error) => erro)
    const emailInexistente = await autenticar(
      { email: 'nao-existe@example.com', senha: 'senha-certa' },
      repo,
    ).catch((erro: Error) => erro)
    const usuarioInativo = await autenticar(
      { email: 'user@example.com', senha: 'senha-certa' },
      inativo,
    ).catch((erro: Error) => erro)

    expect(senhaErrada.message).toBe('Credenciais inválidas')
    expect(emailInexistente.message).toBe(senhaErrada.message)
    expect(usuarioInativo.message).toBe(senhaErrada.message)
  })
})
