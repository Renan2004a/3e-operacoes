import {
  AtividadeNaoEncontradaError,
  OperadorForaDoSetorError,
  registrarExecucao,
} from '../../../../../../modules/producao/registrar-execucao'
import { QuantidadeInvalidaError } from '../../../../../../modules/producao/unidades'
import { prismaProducaoRepository } from '../../../../../../modules/producao/adapters/prisma-producao-repository'
import { autorizar } from '../../../../../../shared/http/autorizacao'

/**
 * POST /api/producao/atividades/[id]/execucoes — registra a execução do operador
 * (PROD-04..07,14,15, AUTH-14). O usuário vem da sessão; o cabeçalho temporário
 * `x-user-id` é ignorado.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'registrar_execucao')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params
  const usuarioId = auth.usuario.userId

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const quantidade =
    typeof body === 'object' && body !== null && 'quantidade' in body
      ? (body as { quantidade?: unknown }).quantidade
      : undefined
  if (typeof quantidade !== 'string' && typeof quantidade !== 'number') {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const result = await registrarExecucao(
      { atividadeId: id, usuarioId, quantidade },
      prismaProducaoRepository,
    )
    return Response.json(
      { execucao: result.execucao, status: result.status, saldo: result.saldo },
      { status: 201 },
    )
  } catch (error) {
    if (error instanceof AtividadeNaoEncontradaError) {
      return Response.json({ error: 'activity_not_found' }, { status: 404 })
    }
    if (error instanceof OperadorForaDoSetorError) {
      return Response.json({ error: 'operator_outside_sector' }, { status: 403 })
    }
    if (error instanceof QuantidadeInvalidaError) {
      return Response.json({ error: 'invalid_quantity' }, { status: 400 })
    }
    throw error
  }
}
