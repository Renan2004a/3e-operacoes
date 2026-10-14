import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Gera .next/standalone (servidor autocontido) para o pacote portátil.
  output: 'standalone',
}

export default nextConfig
