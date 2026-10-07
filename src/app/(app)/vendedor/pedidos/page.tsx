'use client'

import { useState } from 'react'
import { PedidoDetalhe } from '@/shared/ui/pedido-detalhe'
import { PedidosLista, type PedidoListado } from '@/shared/ui/pedidos-lista'

/**
 * Consulta de pedidos do vendedor (FEP-03, FEP-04, FEP-05). O vendedor consulta
 * todos os pedidos e define o prazo; a produção permanece somente leitura.
 */
export default function VendedorPedidosPage() {
  const [selecionado, setSelecionado] = useState<PedidoListado | null>(null)

  return (
    <section className="grid gap-4">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Pedidos</h1>
        <p className="text-sm text-muted">
          Consulte os pedidos e defina o prazo de entrega. A produção é somente leitura.
        </p>
      </header>

      <PedidosLista onSelecionar={setSelecionado} />

      {selecionado ? (
        <PedidoDetalhe orderId={selecionado.id} basePath="/vendedor/pedidos" />
      ) : null}
    </section>
  )
}
