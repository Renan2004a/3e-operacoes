import { prismaOcorrenciasRepository } from '../../../../../../modules/ocorrencias/adapters/prisma-ocorrencias-repository'
import { listarOcorrencias } from '../../../../../../modules/ocorrencias/listar-ocorrencias'
import {
  MotivoInvalidoError,
  ehTipoOcorrencia,
} from '../../../../../../modules/ocorrencias/motivos'
import {
  MotivoObrigatorioError,
  registrarOcorrencia,
} from '../../../../../../modules/ocorrencias/registrar-ocorrencia'
import {
  AtividadeNaoEncontradaError,
  OperadorForaDoSetorError,
} from '../../../../../../modules/producao/registrar-execucao'
import { QuantidadeInvalidaError } from '../../../../../../modules/producao/unidades'
import { autorizar } from '../../../../../../shared/http/autorizacao'

interface OcorrenciaBody {
  tipo?: unknown
  quantidade?: unknown
  duracaoMin?: unknown
  motivoId?: unknown
  observacao?: unknown
}

/**
 * POST /api/producao/atividades/[id]/ocorrencias — registra a ocorrência
 * (OCO-01..06,11,13, AUTH-14). O usuário vem da sessão; o cabeçalho
 * temporário `x-user-id` é ignorado.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'registrar_ocorrencia')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params
  const usuarioId = auth.usuario.userId

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  const campos: OcorrenciaBody =
    typeof body === 'object' && body !== null ? (body as OcorrenciaBody) : {}
  const { tipo, quantidade, duracaoMin, motivoId, observacao } = campos
  const quantidadeValida =
    quantidade === undefined || typeof quantidade === 'string' || typeof quantidade === 'number'
  const duracaoValida = duracaoMin === undefined || typeof duracaoMin === 'number'
  const motivoValido = motivoId === undefined || typeof motivoId === 'string'
  const observacaoValida = observacao === undefined || typeof observacao === 'string'
  if (
    typeof tipo !== 'string' ||
    !ehTipoOcorrencia(tipo) ||
    !quantidadeValida ||
    !duracaoValida ||
    !motivoValido ||
    !observacaoValida
  ) {
    return Response.json({ error: 'invalid_body' }, { status: 400 })
  }

  try {
    const ocorrencia = await registrarOcorrencia(
      {
        atividadeId: id,
        usuarioId,
        tipo,
        quantidade: quantidade as string | number | undefined,
        duracaoMin: duracaoMin as number | undefined,
        motivoId: motivoId as string | undefined,
        observacao: observacao as string | undefined,
      },
      prismaOcorrenciasRepository,
    )
    return Response.json({ ocorrencia }, { status: 201 })
  } catch (error) {
    if (error instanceof AtividadeNaoEncontradaError) {
      return Response.json({ error: 'activity_not_found' }, { status: 404 })
    }
    if (error instanceof OperadorForaDoSetorError) {
      return Response.json({ error: 'operator_outside_sector' }, { status: 403 })
    }
    if (error instanceof MotivoObrigatorioError) {
      return Response.json({ error: 'motivo_required' }, { status: 400 })
    }
    if (error instanceof MotivoInvalidoError) {
      return Response.json({ error: 'invalid_motivo' }, { status: 400 })
    }
    if (error instanceof QuantidadeInvalidaError) {
      return Response.json({ error: 'invalid_quantity' }, { status: 400 })
    }
    throw error
  }
}

/** GET /api/producao/atividades/[id]/ocorrencias — lista as ocorrências (OCO-07,10, AUTH-14). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await autorizar(request, 'registrar_ocorrencia')
  if (!auth.autorizado) return auth.resposta

  const { id } = await context.params

  try {
    const ocorrencias = await listarOcorrencias(id, prismaOcorrenciasRepository)
    return Response.json({ ocorrencias }, { status: 200 })
  } catch (error) {
    if (error instanceof AtividadeNaoEncontradaError) {
      return Response.json({ error: 'activity_not_found' }, { status: 404 })
    }
    throw error
  }
}
