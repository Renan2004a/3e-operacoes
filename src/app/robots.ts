import type { MetadataRoute } from 'next'

/**
 * O sistema é de uso interno: nenhum robô deve indexar telas, pedidos ou nomes
 * de clientes. O acesso é sempre por URL conhecida + autenticação.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', disallow: '/' }],
  }
}
