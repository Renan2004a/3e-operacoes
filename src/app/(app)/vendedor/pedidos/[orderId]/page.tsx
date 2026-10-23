'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { PedidoDetalhe } from '@/shared/ui/pedido-detalhe'

/**
 * Detalhe do pedido do vendedor em rota própria. Antes o detalhe era renderizado
 * na mesma página da lista, então "Voltar para os pedidos" apontava para a
 * própria tela e não fazia nada. Com a rota, abrir e voltar funcionam de fato.
 */
export default function PedidoVendedorPage() {
  const params = useParams<{ orderId: string }>()
  const searchParams = useSearchParams()

  return (
    <PedidoDetalhe
      orderId={params.orderId}
      basePath="/vendedor/pedidos"
      retorno={searchParams.get('retorno')}
      permitirClassificacao
    />
  )
}
