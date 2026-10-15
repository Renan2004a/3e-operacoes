'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ImportarPedido } from '@/shared/ui/importar-pedido'
import { PageHead } from '@/shared/ui/page-head'
import { PedidoDetalhe } from '@/shared/ui/pedido-detalhe'
import { PedidosLista, type PedidoListado } from '@/shared/ui/pedidos-lista'

/**
 * Área de Vendas (FEP-03, FEP-04, FEP-05). O vendedor puxa o pedido do Top
 * Gerente pelo número, desmembra os itens por setor, define prazos e acompanha o
 * saldo. A produção permanece somente leitura.
 */
export default function VendedorPedidosPage() {
  const [selecionado, setSelecionado] = useState<PedidoListado | null>(null)
  const [recarregarToken, setRecarregarToken] = useState(0)

  return (
    <section className="grid gap-5">
      <PageHead
        title="Vendas"
        description="Puxe o pedido do Top Gerente, desmembre os itens por setor e acompanhe o saldo de entrega."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ImportarPedido onConcluido={() => setRecarregarToken((valor) => valor + 1)} />

        <Card>
          <CardHeader>
            <CardTitle>Como funciona</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="grid gap-3 text-sm text-ink">
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                  1
                </span>
                <span>
                  Informe o <strong>número do pedido</strong> e puxe os dados do Top Gerente.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                  2
                </span>
                <span>
                  Abra o pedido e faça o <strong>desmembramento</strong>: associe cada item ao
                  setor responsável (Corte e Dobra, Telhas ou Revenda).
                </span>
              </li>
              <li className="flex gap-3">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-white">
                  3
                </span>
                <span>
                  Defina o <strong>prazo de entrega</strong> do item quando necessário e acompanhe
                  o saldo (solicitado, executado, disponível, entregue e pendente).
                </span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold text-ink">Pedidos</h2>
        <PedidosLista recarregarToken={recarregarToken} onSelecionar={setSelecionado} />
      </div>

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
