/**
 * Códigos dos setores operacionais (enum `SectorCode` do banco). São estáveis
 * entre ambientes, ao contrário do id interno do setor, e identificam o setor
 * nos filtros da consulta de pedidos.
 */
export const CODIGOS_SETOR = ['CORTE_DOBRA', 'TELHAS', 'REVENDA'] as const

export type CodigoSetor = (typeof CODIGOS_SETOR)[number]

export function ehCodigoSetor(valor: string): valor is CodigoSetor {
  return (CODIGOS_SETOR as readonly string[]).includes(valor)
}
