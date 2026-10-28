/**
 * Política mínima de senha para o go-live. Não substitui um gerenciador de
 * senhas, mas impede as escolhas mais óbvias em um sistema que fica exposto na
 * internet.
 */
export const SENHA_MINIMA = 8

/** Indica se a senha atende ao tamanho mínimo exigido. */
export function senhaAtendePolitica(senha: string): boolean {
  return senha.length >= SENHA_MINIMA
}

/** Mensagem única para a API e para a interface. */
export const MENSAGEM_SENHA_CURTA = `A senha deve ter pelo menos ${SENHA_MINIMA} caracteres.`
