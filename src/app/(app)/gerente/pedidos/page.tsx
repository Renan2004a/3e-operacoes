'use client'

import { useRouter } from 'next/navigation'
import { PedidosLista } from '@/shared/ui/pedidos-lista'

/** Consulta de pedidos do gerente; seleciona um pedido e abre o detalhe (FEP-03). */
export default function PedidosGerentePage() {
  const router = useRouter()

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Pedidos</h1>
        <p className="text-sm text-muted">Consulte e abra o detalhe dos pedidos.</p>
      </header>

      <PedidosLista
        onSelecionar={(pedido) => router.push(`/gerente/pedidos/${pedido.id}`)}
      />
    </section>
  )
}
