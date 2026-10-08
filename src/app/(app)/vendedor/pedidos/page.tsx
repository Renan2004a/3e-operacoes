'use client'

import { useState } from 'react'
import { PageHead } from '@/shared/ui/page-head'
import { PedidoDetalhe } from '@/shared/ui/pedido-detalhe'
import { PedidosLista, type PedidoListado } from '@/shared/ui/pedidos-lista'

/**
 * Consulta de pedidos do vendedor (FEP-03, FEP-04, FEP-05). O vendedor consulta
 * todos os pedidos, define o prazo e faz o desmembramento dos itens por setor;
 * a produção permanece somente leitura.
 */
export default function VendedorPedidosPage() {
  const [selecionado, setSelecionado] = useState<PedidoListado | null>(null)

  return (
    <section className="grid gap-4">
      <PageHead
        title="Pedidos"
        description="Consulte os pedidos, defina o prazo e faça o desmembramento dos itens por setor. A produção é somente leitura."
      />

      <PedidosLista onSelecionar={setSelecionado} />

      {selecionado ? (
        <PedidoDetalhe
          orderId={selecionado.id}
          basePath="/vendedor/pedidos"
          permitirClassificacao
        />
      ) : null}
    </section>
  )
}
