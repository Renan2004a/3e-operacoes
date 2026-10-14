import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // "standalone" é usado apenas para gerar o pacote portátil (NEXT_OUTPUT=standalone).
  // No deploy normal (Railway/Vercel) mantém-se o padrão, para o `next start` funcionar.
  ...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' as const } : {}),
}

export default nextConfig
