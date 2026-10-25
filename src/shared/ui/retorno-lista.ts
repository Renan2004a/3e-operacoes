/**
 * Navegação lista ↔ detalhe preservando o contexto da consulta.
 *
 * O detalhe recebe a listagem de origem no parâmetro `retorno`; o valor é
 * validado contra a rota interna da listagem do perfil antes de virar link.
 * Assim o retorno funciona após F5, em nova aba ou depois de uma ação na tela,
 * sem depender apenas do histórico do navegador.
 */

const ORIGEM_INTERNA = 'http://retorno.interno'

/**
 * Normaliza a query string: remove o próprio parâmetro `retorno` (evita
 * aninhamento) e colapsa parâmetros repetidos. A codificação é delegada ao
 * `URLSearchParams`, que preserva os valores especiais.
 */
function buscaNormalizada(params: URLSearchParams): string {
  const normalizados = new URLSearchParams()
  for (const [chave, valor] of params) {
    if (chave === 'retorno') continue
    normalizados.set(chave, valor)
  }
  const busca = normalizados.toString()
  return busca ? `?${busca}` : ''
}

/** Caminho e query da listagem no momento da abertura do pedido. */
export function caminhoDaListagemAtual(pathname: string, search: string): string {
  return `${pathname}${buscaNormalizada(new URLSearchParams(search))}`
}

/**
 * Valida o destino de retorno. Aceita somente a rota interna de listagem
 * informada em `basePath`; qualquer outro caminho, origem externa, esquema
 * arbitrário ou valor ausente cai na listagem padrão.
 */
export function resolverRetornoListagem(
  retorno: string | null | undefined,
  basePath: string,
): string {
  if (!retorno || !retorno.startsWith('/')) return basePath

  let base: URL
  let alvo: URL
  try {
    base = new URL(basePath, ORIGEM_INTERNA)
    alvo = new URL(retorno, ORIGEM_INTERNA)
  } catch {
    return basePath
  }

  if (alvo.origin !== base.origin || alvo.pathname !== base.pathname) return basePath
  return `${base.pathname}${buscaNormalizada(alvo.searchParams)}`
}

/**
 * Monta a URL do detalhe com o contexto da listagem, quando houver. Sem
 * contexto útil, devolve a rota de detalhe limpa, cujo "Voltar" usa a listagem
 * padrão do perfil.
 */
export function montarUrlDetalhe(basePath: string, orderId: string, retorno: string): string {
  const destino = resolverRetornoListagem(retorno, basePath)
  const params = new URLSearchParams()
  if (destino !== basePath) params.set('retorno', destino)
  const busca = params.toString()
  return `${basePath}/${encodeURIComponent(orderId)}${busca ? `?${busca}` : ''}`
}
