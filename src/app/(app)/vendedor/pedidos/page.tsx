'use client'

import { useState } from 'react'
import { PageHead } from '@/shared/ui/page-head'
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
      <PageHead
        title="Pedidos"
        description="Consulte os pedidos e defina o prazo de entrega. A produção é somente leitura."
      />

      <PedidosLista onSelecionar={setSelecionado} />

      {selecionado ? (
        <PedidoDetalhe orderId={selecionado.id} basePath="/vendedor/pedidos" />
      ) : null}
    </section>
  )
}
