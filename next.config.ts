import type { NextConfig } from 'next'

/**
 * Cabeçalhos de segurança aplicados a todas as respostas. O app é interno e
 * autenticado: bloqueia enquadramento em outros sites, evita sniffing de tipo,
 * limita referenciadores e desliga APIs sensíveis do navegador.
 *
 * CSP completa fica para depois do go-live: o Next injeta scripts inline no
 * HTML e uma política restritiva sem nonce quebraria a hidratação.
 */
const CABECALHOS_SEGURANCA = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
]

const nextConfig: NextConfig = {
  // "standalone" é usado apenas para gerar o pacote portátil (NEXT_OUTPUT=standalone).
  // No deploy normal (Railway/Vercel) mantém-se o padrão, para o `next start` funcionar.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' as const } : {}),
  async headers() {
    return [{ source: '/:path*', headers: CABECALHOS_SEGURANCA }]
  },
}

export default nextConfig
