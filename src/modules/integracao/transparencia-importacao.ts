import { mensagemFalhaImportacao } from './mensagens-importacao'
import type { OrigemSolicitacao } from './resultado-solicitacao'

export interface EventoImportacao {
  type: string
  detail: string | null
  createdAt?: string
}

export interface DivergenciaUnidadeEvento {
  legacyItemKey: string
  description: string | null
  unidadeAnterior: string
  unidadeNova: string
  motivo: 'REGISTROS_OPERACIONAIS'
}

export interface MensagemImportacao {
  titulo: string
  mensagem: string
}

/** Último evento do tipo informado, ou null. */
export function ultimoEvento(
  events: readonly EventoImportacao[] | null | undefined,
  tipo: string,
): EventoImportacao | null {
  return (events ?? []).filter((event) => event.type === tipo).at(-1) ?? null
}

/** Eventos do tipo informado criados em/após `desde` (ou todos, sem `desde`). */
function eventosDesde(
  events: readonly EventoImportacao[] | null | undefined,
  tipo: string,
  desde: string | null | undefined,
): EventoImportacao[] {
  const encontrados = (events ?? []).filter((event) => event.type === tipo)
  if (!desde) return encontrados
  const limite = new Date(desde).getTime()
  if (Number.isNaN(limite)) return encontrados
  return encontrados.filter(
    (event) => event.createdAt !== undefined && new Date(event.createdAt).getTime() >= limite,
  )
}

/** Indica se o último sucesso foi uma atualização de pedido existente. */
export function sucessoFoiReimportacao(
  events: readonly EventoImportacao[] | null | undefined,
  desde?: string | null,
): boolean {
  return eventosDesde(events, 'SUCCEEDED', desde).at(-1)?.detail === 'REIMPORTED'
}

/** Código técnico da última falha registrada no job. */
export function codigoDaFalha(
  events: readonly EventoImportacao[] | null | undefined,
  desde?: string | null,
): string | null {
  return eventosDesde(events, 'FAILED', desde).at(-1)?.detail ?? null
}

/** Existe evento do tipo informado criado em/após o instante da solicitação. */
export function temEventoNovo(
  events: readonly EventoImportacao[] | null | undefined,
  tipo: string,
  solicitadoEm: string | null,
): boolean {
  if (!solicitadoEm) return true
  const desde = new Date(solicitadoEm).getTime()
  if (Number.isNaN(desde)) return true
  return (events ?? []).some(
    (event) =>
      event.type === tipo &&
      event.createdAt !== undefined &&
      new Date(event.createdAt).getTime() >= desde,
  )
}

/** Divergências de unidade do último evento UNIT_DIVERGENCE. */
export function divergenciasUnidadeDosEventos(
  events: readonly EventoImportacao[] | null | undefined,
  desde?: string | null,
): DivergenciaUnidadeEvento[] {
  const evento = eventosDesde(events, 'UNIT_DIVERGENCE', desde).at(-1) ?? null
  if (!evento?.detail) return []
  try {
    const dados = JSON.parse(evento.detail) as unknown
    if (!Array.isArray(dados)) return []
    return dados.filter(
      (item): item is DivergenciaUnidadeEvento =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as DivergenciaUnidadeEvento).legacyItemKey === 'string' &&
        typeof (item as DivergenciaUnidadeEvento).unidadeAnterior === 'string' &&
        typeof (item as DivergenciaUnidadeEvento).unidadeNova === 'string',
    )
  } catch {
    return []
  }
}

/** Texto de acompanhamento enquanto o job não terminou. */
export function mensagemEmAndamento(origem: OrigemSolicitacao): MensagemImportacao {
  if (origem === 'EM_ANDAMENTO') {
    return {
      titulo: 'Acompanhando tentativa em andamento',
      mensagem:
        'Esta tentativa já estava em andamento; nenhuma nova consulta foi iniciada por esta solicitação.',
    }
  }
  return {
    titulo: 'Consulta ao Top Gerente em andamento',
    mensagem: 'A nova consulta foi solicitada. O resultado será exibido quando o job terminar.',
  }
}

/** Mensagem final, distinguindo consulta nova, tentativa reaproveitada e resultado anterior. */
export function mensagemDoResultado(input: {
  origem: OrigemSolicitacao
  status: 'SUCCEEDED' | 'FAILED'
  reimportado: boolean
  /** Código técnico da falha atual; quando presente, a orientação é traduzida. */
  errorCode?: string | null
}): MensagemImportacao {
  if (input.status === 'FAILED') {
    // A transparência da origem continua visível, mas o código técnico não é a
    // única informação: o usuário recebe a orientação correspondente (PR #5).
    const orientacao = mensagemFalhaImportacao(input.errorCode).mensagem
    if (input.origem === 'RESULTADO_ANTERIOR') {
      return {
        titulo: 'Tentativa anterior falhou',
        mensagem: `Nenhuma nova consulta ao Top Gerente foi feita; este é o resultado da tentativa recente. ${orientacao}`,
      }
    }
    if (input.origem === 'EM_ANDAMENTO') {
      return {
        titulo: 'Tentativa em andamento falhou',
        mensagem: `A tentativa que já estava em andamento terminou com falha. Nenhuma nova consulta foi iniciada por esta solicitação. ${orientacao}`,
      }
    }
    return {
      titulo: 'Consulta ao Top Gerente falhou',
      mensagem: `A nova consulta não foi concluída. ${orientacao}`,
    }
  }

  if (input.origem === 'RESULTADO_ANTERIOR') {
    return {
      titulo: 'Resultado de importação anterior',
      mensagem:
        'Nenhuma nova consulta ao Top Gerente foi feita; este é o resultado da importação recente.',
    }
  }

  if (input.origem === 'EM_ANDAMENTO') {
    return input.reimportado
      ? {
          titulo: 'Tentativa em andamento concluída',
          mensagem: 'A tentativa que já estava em andamento atualizou o pedido existente.',
        }
      : {
          titulo: 'Tentativa em andamento concluída',
          mensagem: 'A tentativa que já estava em andamento importou o pedido.',
        }
  }

  return input.reimportado
    ? {
        titulo: 'Pedido atualizado',
        mensagem: 'O Top Gerente foi consultado e o pedido existente foi atualizado.',
      }
    : {
        titulo: 'Importação concluída',
        mensagem: 'O Top Gerente foi consultado e o pedido foi importado.',
      }
}
