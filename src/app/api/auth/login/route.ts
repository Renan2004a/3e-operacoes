import { CredenciaisInvalidasError, autenticar } from '../../../../modules/auth/autenticar'
import { prismaAuthRepository } from '../../../../modules/auth/adapters/prisma-auth-repository'
import { LimitadorTentativas } from '../../../../modules/auth/limite-tentativas'
import { serializarCookieSessao } from '../../../../shared/http/auth-context'
import { ipDaRequisicao } from '../../../../shared/http/ip-requisicao'

interface LoginBody {
  email?: unknown
  senha?: unknown
}

/**
 * Limites de tentativa por combinação IP + e-mail e por IP. Valores pensados
 * para o turno de fábrica: 5 erros de senha em 15 min bloqueiam apenas aquela
 * combinação; 30 erros no mesmo IP (troca de e-mails) bloqueiam o IP.
 */
const limitadorPorUsuario = new LimitadorTentativas({
  maxFalhas: 5,
  janelaMs: 15 * 60 * 1000,
  bloqueioMs: 15 * 60 * 1000,
})

const limitadorPorIp = new LimitadorTentativas({
  maxFalhas: 30,
  janelaMs: 15 * 60 * 1000,
  bloqueioMs: 15 * 60 * 1000,
})

/**
 * POST /api/auth/login — valida as credenciais e emite a sessão em cookie
 * httpOnly (AUTH-01, AUTH-02, AUTH-06, AUTH-15). Credenciais inválidas e
 * usuário inativo respondem `401` sem distinguir o motivo; excesso de
 * tentativas responde `429` com `Retry-After`.
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const campos: LoginBody = typeof body === 'object' && body !== null ? (body as LoginBody) : {}
  if (
    typeof campos.email !== 'string' ||
    typeof campos.senha !== 'string' ||
    campos.email.trim() === '' ||
    campos.senha === ''
  ) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  limitadorPorUsuario.limparExpirados()
  limitadorPorIp.limparExpirados()

  const ip = ipDaRequisicao(request)
  const email = campos.email.trim().toLowerCase()
  const chaveUsuario = `${ip}|${email}`
  // Sem IP confiável (on-premise sem proxy), o balde por IP seria compartilhado
  // por toda a empresa e um erro de digitação bloquearia todos. Nesse caso vale
  // apenas o limite por e-mail.
  const limitarPorIp = ip !== 'desconhecido'

  const bloqueioUsuario = limitadorPorUsuario.verificar(chaveUsuario)
  const bloqueioIp = limitarPorIp
    ? limitadorPorIp.verificar(ip)
    : { bloqueado: false, restanteMs: 0 }
  const bloqueio = bloqueioUsuario.bloqueado ? bloqueioUsuario : bloqueioIp
  if (bloqueio.bloqueado) {
    const segundos = Math.max(1, Math.ceil(bloqueio.restanteMs / 1000))
    return Response.json(
      { error: 'too_many_attempts' },
      { status: 429, headers: { 'Retry-After': String(segundos) } },
    )
  }

  try {
    const sessao = await autenticar(
      { email: campos.email, senha: campos.senha },
      prismaAuthRepository,
    )
    limitadorPorUsuario.limpar(chaveUsuario)
    if (limitarPorIp) limitadorPorIp.limpar(ip)
    const maxAge = Math.floor((sessao.expiraEm.getTime() - Date.now()) / 1000)
    return Response.json(
      { usuario: { id: sessao.userId } },
      {
        status: 200,
        headers: { 'Set-Cookie': serializarCookieSessao(sessao.token, maxAge) },
      },
    )
  } catch (error) {
    if (error instanceof CredenciaisInvalidasError) {
      limitadorPorUsuario.registrarFalha(chaveUsuario)
      if (limitarPorIp) limitadorPorIp.registrarFalha(ip)
      return Response.json({ error: 'invalid_credentials' }, { status: 401 })
    }
    throw error
  }
}
