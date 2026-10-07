'use client'

import { useParams } from 'next/navigation'
import { PedidoDetalhe } from '@/shared/ui/pedido-detalhe'

/** Detalhe do pedido do gerente, com os cinco valores por item e o prazo (FEP-04, FEP-05). */
export default function PedidoGerentePage() {
  const params = useParams<{ orderId: string }>()

  return <PedidoDetalhe orderId={params.orderId} basePath="/gerente/pedidos" />
}
