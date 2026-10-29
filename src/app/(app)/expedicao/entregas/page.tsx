'use client'

import { useRouter } from 'next/navigation'
import { PageHead } from '@/shared/ui/page-head'
import { PedidosLista } from '@/shared/ui/pedidos-lista'
import { montarUrlDetalhe } from '@/shared/ui/retorno-lista'

/**
 * Lista de pedidos da Expedição (FEP-06). Usa a mesma lista da Venda e da
 * Gerência (busca por número e cliente, filtros, páginas), então o expedidor
 * encontra qualquer pedido e não só os mais recentes. Abrir um pedido navega
 * para a rota própria, e o "Voltar" devolve esta lista com a busca preservada.
 */
export default function EntregasPage() {
  const router = useRouter()

  return (
    <section className="grid gap-5">
      <PageHead
        title="Entregas"
        description="Escolha o pedido para ver os itens disponíveis e registrar a entrega."
      />

      <PedidosLista
        onSelecionar={(pedido, { retorno }) =>
          router.push(montarUrlDetalhe('/expedicao/entregas', pedido.id, retorno))
        }
      />
    </section>
  )
}
