'use client'

import { ImportarPedido } from '@/shared/ui/importar-pedido'
import { PageHead } from '@/shared/ui/page-head'

/** Importação de um pedido do Top Gerente por número (LAC-01, LAC-02, LAC-03). */
export default function ImportarPedidoPage() {
  return (
    <section className="grid gap-4">
      <PageHead
        title="Importar pedido"
        description="Informe o número do pedido para importar do Top Gerente."
      />
      <ImportarPedido />
    </section>
  )
}
