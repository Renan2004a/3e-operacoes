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
import { requireInternalToken } from '../../../../../../shared/http/internal-auth'

interface OcorrenciaBody {
  tipo?: unknown
  quantidade?: unknown
  duracaoMin?: unknown
  motivoId?: unknown
  observacao?: unknown
}

/**
 * POST /api/producao/atividades/[id]/ocorrencias — registra a ocorrência
 * (OCO-01..06,11,13). Enquanto a autenticação não existe, o usuário atual vem
 * do cabeçalho temporário `x-user-id`.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const usuarioId = request.headers.get('x-user-id') ?? ''

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

/** GET /api/producao/atividades/[id]/ocorrencias — lista as ocorrências (OCO-07,10). */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!requireInternalToken(request)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 })
  }

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
