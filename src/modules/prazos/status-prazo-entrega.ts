import type { Quantidade } from '../producao/unidades'
import { calcularStatusPrazo, type StatusPrazo } from './atraso'

export interface CalcularStatusPrazoEntregaInput {
  /** Prazo de entrega do item; null/ausente quando não foi definido (AD-009). */
  prazo: Date | null
  /** Quantidade solicitada ao cliente (AD-011). */
  solicitado: Quantidade
  /** Soma das quantidades já entregues do item. */
  entregue: Quantidade
  /** Instante da consulta, em UTC. */
  agora: Date
}

/**
 * Status comercial do prazo de entrega do item (AD-025). O atraso existe
 * somente quando há prazo, o prazo terminou e o atendimento integral ainda não
 * foi alcançado (`entregue < solicitado`). A conclusão usada aqui é a do
 * atendimento ao cliente, não a do executado (RN004/AD-011).
 */
export function calcularStatusPrazoEntrega({
  prazo,
  solicitado,
  entregue,
  agora,
}: CalcularStatusPrazoEntregaInput): StatusPrazo {
  return calcularStatusPrazo({
    prazo,
    concluido: entregue.gte(solicitado),
    agora,
  })
}
