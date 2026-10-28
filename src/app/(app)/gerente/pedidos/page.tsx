'use client'

import { useRouter } from 'next/navigation'
import { PageHead } from '@/shared/ui/page-head'
import { PedidosLista } from '@/shared/ui/pedidos-lista'
import { montarUrlDetalhe } from '@/shared/ui/retorno-lista'

/** Consulta de pedidos do gerente; seleciona um pedido e abre o detalhe (FEP-03). */
export default function PedidosGerentePage() {
  const router = useRouter()

  return (
    <section className="grid gap-4">
      <PageHead title="Pedidos" description="Consulte e abra o detalhe dos pedidos." />

      <PedidosLista
        onSelecionar={(pedido, { retorno }) =>
          router.push(montarUrlDetalhe('/gerente/pedidos', pedido.id, retorno))
        }
      />
    </section>
  )
}
