import {
  IDEMPOTENCY_WINDOW_MS,
  InvalidOrderNumberError,
} from '../../../../modules/integracao/contratos'
import {
  classificarOrigemSolicitacao,
  statusEstaAtivo,
} from '../../../../modules/integracao/resultado-solicitacao'
import { solicitarImportacao } from '../../../../modules/integracao/solicitar-importacao'
import { prismaIntegracaoRepository } from '../../../../modules/integracao/adapters/prisma-integracao-repository'
import { autorizar } from '../../../../shared/http/autorizacao'
import { agendarDespacho } from '../despacho'

/** POST /api/integracao/pedidos — cria o job idempotente e responde 202 (AUTH-14). */
export async function POST(request: Request) {
  const auth = await autorizar(request, 'solicitar_importacao')
  if (!auth.autorizado) return auth.resposta

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const orderNumber =
    typeof body === 'object' && body !== null && 'orderNumber' in body
      ? (body as { orderNumber?: unknown }).orderNumber
      : undefined
  if (typeof orderNumber !== 'string') {
    return Response.json({ error: 'invalid_order_number' }, { status: 400 })
  }

  let result: Awaited<ReturnType<typeof solicitarImportacao>>
  try {
    result = await solicitarImportacao(
      {
        orderNumber,
        now: new Date(),
        requestedByUserId: auth.usuario.userId,
      },
      prismaIntegracaoRepository,
    )
  } catch (error) {
    if (error instanceof InvalidOrderNumberError) {
      return Response.json({ error: 'invalid_order_number' }, { status: 400 })
    }
    throw error
  }

  const solicitadoEm = new Date()
  const job = await prismaIntegracaoRepository.findById(result.jobId)
  const statusReal = job?.status ?? 'PENDING'
  // Job ativo antigo (fora da janela) ainda é uma tentativa em andamento: não
  // dispara outro processamento. Apenas job final antigo inicia nova consulta.
  const jobAtivoAntigo =
    job !== null &&
    !result.reused &&
    statusEstaAtivo(statusReal) &&
    job.createdAt.getTime() < solicitadoEm.getTime() - IDEMPOTENCY_WINDOW_MS
  const origem = jobAtivoAntigo
    ? 'EM_ANDAMENTO'
    : classificarOrigemSolicitacao(result.reused, statusReal)
  // Em uma consulta nova, o job pode ser antigo (reutilizado pelo upsert da
  // chave base). Não devolve o estado final antigo como se fosse desta consulta.
  const status = result.reused || jobAtivoAntigo ? statusReal : 'PENDING'

  if (!result.reused && !jobAtivoAntigo) {
    // Captura o estado da tentativa no momento da solicitação: evita despacho
    // duplicado em cliques repetidos e permite reimportar um job final antigo
    // (fora da janela) sem perder a chamada ao conector.
    if (job) {
      const dentroDaJanela = Date.now() - job.createdAt.getTime() <= IDEMPOTENCY_WINDOW_MS
      agendarDespacho({
        jobId: result.jobId,
        orderNumber,
        statusEsperado: dentroDaJanela ? 'PENDING' : job.status,
        atualizadoEmEsperado: job.updatedAt,
      })
    }
  }

  return Response.json(
    {
      jobId: result.jobId,
      orderId: job?.orderId ?? null,
      status,
      origem,
      solicitadoEm: solicitadoEm.toISOString(),
    },
    { status: 202 },
  )
}
