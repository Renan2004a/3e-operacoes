import { Prisma } from '@/generated/prisma/client'
import type { Quantidade } from './unidades'

import { chaveUnidade, compararUnidades, rotuloUnidade } from './unidade-medida'

export { chaveUnidade, compararUnidades, rotuloUnidade } from './unidade-medida'

export interface GrupoPorUnidade<T> {
  /** Unidade do grupo, ou `null` quando os itens não têm unidade informada (RN05). */
  unidade: string | null
  itens: T[]
}

/**
 * Agrupa os itens pela unidade de medida. Itens de unidades diferentes nunca
 * entram no mesmo grupo, então o chamador soma apenas quantidades compatíveis
 * (RN01, RN02). Itens sem unidade formam um grupo próprio (RN05).
 */
export function agruparPorUnidade<T>(
  itens: readonly T[],
  unidadeDe: (item: T) => string,
): GrupoPorUnidade<T>[] {
  const grupos = new Map<string, GrupoPorUnidade<T>>()
  for (const item of itens) {
    const unidade = rotuloUnidade(unidadeDe(item))
    const chave = unidade === null ? '' : chaveUnidade(unidade)
    const grupo = grupos.get(chave) ?? { unidade, itens: [] }
    grupo.itens.push(item)
    grupos.set(chave, grupo)
  }
  return [...grupos.values()].sort((a, b) => compararUnidades(a.unidade, b.unidade))
}

/** Soma quantidades já da mesma unidade, sem arredondar (RN04). */
export function somarQuantidades(quantidades: readonly Quantidade[]): Quantidade {
  return quantidades.reduce((total, valor) => total.plus(valor), new Prisma.Decimal(0))
}
