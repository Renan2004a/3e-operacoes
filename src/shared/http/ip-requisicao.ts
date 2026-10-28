/** Cabeçalhos mínimos para descobrir a origem de uma requisição. */
export interface RequisicaoComHeaders {
  headers: { get(name: string): string | null }
}

/**
 * IP do cliente atrás do proxy do Railway. O primeiro item de
 * `x-forwarded-for` é o cliente original; sem os cabeçalhos (dev/testes),
 * devolve `desconhecido`. Usado apenas para limitar tentativas, nunca para
 * autorização.
 */
export function ipDaRequisicao(request: RequisicaoComHeaders): string {
  const encaminhado = request.headers.get('x-forwarded-for')
  if (encaminhado) {
    const primeiro = encaminhado.split(',')[0]?.trim()
    if (primeiro) return primeiro
  }

  const real = request.headers.get('x-real-ip')?.trim()
  return real && real !== '' ? real : 'desconhecido'
}
