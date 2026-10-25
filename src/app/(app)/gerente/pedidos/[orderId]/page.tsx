'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { PedidoDetalhe } from '@/shared/ui/pedido-detalhe'

/** Detalhe do pedido do gerente, com os cinco valores por item, prazo e classificação (FEP-04, FEP-05, LAC-04). */
export default function PedidoGerentePage() {
  const params = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()

  return (
    <PedidoDetalhe
      orderId={params.orderId}
      basePath="/gerente/pedidos"
      retorno={searchParams.get('retorno')}
      permitirClassificacao
    />
  )
}
