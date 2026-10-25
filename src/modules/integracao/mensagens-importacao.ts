/**
 * Tradução dos códigos técnicos da importação para mensagens ao usuário.
 *
 * O código continua disponível na interface e nos logs para diagnóstico, mas
 * nunca é a única informação apresentada. Este módulo é seguro para o cliente
 * (não importa banco nem variáveis de ambiente).
 */

export interface MensagemImportacao {
  titulo: string
  mensagem: string
}

interface EventoStatus {
  type: string
  detail: string | null
}

const GENERICA: MensagemImportacao = {
  titulo: 'Não foi possível importar o pedido',
  mensagem:
    'Ocorreu uma falha ao concluir a importação. Tente novamente. Se o problema continuar, informe o código técnico ao responsável pelo sistema.',
}

const NAO_ENCONTRADO: MensagemImportacao = {
  titulo: 'Pedido não encontrado no Top Gerente',
  mensagem:
    'Pedido não encontrado no Top Gerente. Confira o número informado e utilize o número do pedido no Top Gerente, que pode ser diferente do número no 3E.',
}

const INTEGRACAO_INDISPONIVEL: MensagemImportacao = {
  titulo: 'Integração com o Top Gerente indisponível',
  mensagem:
    'Não foi possível acessar o Top Gerente agora. O conector local pode estar fora do ar ou sem acesso à rede. Tente novamente em alguns minutos; se persistir, acione o responsável pelo sistema.',
}

const INTEGRACAO_LENTA: MensagemImportacao = {
  titulo: 'A integração com o Top Gerente demorou demais',
  mensagem:
    'O Top Gerente não respondeu dentro do tempo esperado. Aguarde alguns instantes e tente novamente; se persistir, acione o responsável pelo sistema.',
}

const INTEGRACAO_NAO_AUTORIZADA: MensagemImportacao = {
  titulo: 'Integração com o Top Gerente recusada',
  mensagem:
    'A integração não conseguiu autenticar no Top Gerente. O pedido não foi importado. Acione o responsável pelo sistema para conferir a configuração do conector.',
}

const DADOS_INCOMPATIVEIS: MensagemImportacao = {
  titulo: 'Dados do pedido não puderam ser interpretados',
  mensagem:
    'O Top Gerente respondeu com dados que o 3E não conseguiu interpretar. O pedido não foi importado. Acione o responsável pelo sistema informando o código técnico.',
}

const FALHA_SAVE: MensagemImportacao = {
  titulo: 'Falha ao salvar os dados importados',
  mensagem:
    'O pedido foi localizado no Top Gerente, mas não foi possível salvar os dados no 3E. Tente novamente; se o problema continuar, acione o responsável pelo sistema.',
}

const POR_CODIGO: Record<string, MensagemImportacao> = {
  ORDER_NOT_FOUND: NAO_ENCONTRADO,
  CONNECTOR_UNAVAILABLE: INTEGRACAO_INDISPONIVEL,
  CONNECTOR_HTTP_ERROR: INTEGRACAO_INDISPONIVEL,
  DISPATCH_FAILED: INTEGRACAO_INDISPONIVEL,
  CONNECTOR_TIMEOUT: INTEGRACAO_LENTA,
  CONNECTOR_UNAUTHORIZED: INTEGRACAO_NAO_AUTORIZADA,
  CONNECTOR_INVALID_RESPONSE: DADOS_INCOMPATIVEIS,
  INVALID_CALLBACK_PAYLOAD: DADOS_INCOMPATIVEIS,
  UPSERT_FAILED: FALHA_SAVE,
}

/** Mensagem correspondente ao código; usa uma orientação segura como fallback. */
export function mensagemFalhaImportacao(codigo: string | null | undefined): MensagemImportacao {
  if (!codigo) return GENERICA
  return POR_CODIGO[codigo] ?? GENERICA
}

/** Mensagem de sucesso, distinguindo a primeira importação da reimportação. */
export function mensagemSucessoImportacao(reimportado: boolean): MensagemImportacao {
  if (reimportado) {
    return {
      titulo: 'Pedido atualizado',
      mensagem:
        'Este pedido já existia no 3E. Os dados comerciais e as quantidades foram atualizados, e o histórico operacional foi preservado.',
    }
  }
  return {
    titulo: 'Importação concluída',
    mensagem: 'O pedido foi importado com sucesso e já está disponível na lista.',
  }
}

/**
 * Código da falha da tentativa atual. Prefere o campo `errorCode` do job (mais
 * recente) e só usa eventos como compatibilidade com respostas antigas. Isso
 * evita exibir o `UPSERT_FAILED` de uma tentativa antiga quando a falha atual é
 * outra (ex.: conector indisponível).
 */
export function codigoFalhaAtual(
  status: string,
  errorCode: string | null | undefined,
  events: readonly EventoStatus[] | null | undefined,
): string | null {
  if (status !== 'FAILED') return null
  if (errorCode) return errorCode
  const falhas = (events ?? []).filter((event) => event.type === 'FAILED')
  return falhas.at(-1)?.detail ?? null
}

/** Indica se o sucesso atual foi uma reimportação (atualização de pedido existente). */
export function sucessoFoiReimportacao(
  status: string,
  events: readonly EventoStatus[] | null | undefined,
): boolean {
  if (status !== 'SUCCEEDED') return false
  const sucessos = (events ?? []).filter((event) => event.type === 'SUCCEEDED')
  return sucessos.at(-1)?.detail === 'REIMPORTED'
}
