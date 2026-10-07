import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '3E Operações',
  description: 'Gestão operacional de pedidos, produção e expedição',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
