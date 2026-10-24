import { Prisma } from '@/generated/prisma/browser'
import { formatarQuantidade } from '@/modules/producao/formato-quantidade'
import { chaveUnidade, rotuloUnidade } from '@/modules/producao/unidade-medida'

/** Valor quantitativo como a API o entrega: string decimal ou número. */
export type ValorQuantidade = string | number

/** Total de um grupo de itens com a mesma unidade, como a API o entrega. */
export interface TotalUnidadeView {
  unidade: string | null
  itens: number
  solicitado: string | number
  executado: string | number
  disponivel: string | number
  entregue: string | number
  pendente: string | number
}

export type CampoTotal = Exclude<keyof TotalUnidadeView, 'unidade' | 'itens'>

/** Rótulo do grupo sem unidade informada: nunca se inventa uma unidade (RN05). */
export const ROTULO_SEM_UNIDADE = 'sem unidade informada'

export function rotuloDaUnidade(unidade: string | null): string {
  return unidade ?? ROTULO_SEM_UNIDADE
}

/**
 * Valor de um campo por unidade, sem somar unidades diferentes (RN01, RN02):
 * "30 peça · 15 metro". Sem itens, mostra "0".
 */
export function valorPorUnidade(totais: readonly TotalUnidadeView[], campo: CampoTotal): string {
  if (totais.length === 0) return '0'
  return totais.map((total) => `${total[campo]} ${rotuloDaUnidade(total.unidade)}`).join(' · ')
}

/**
 * Formata uma quantidade para exibição reutilizando a regra de unidade já
 * existente: metro com 2 casas, demais unidades inteiras (RN020, RN022).
 * Sem unidade, ou com valor que o formatador não reconhece, devolve o valor
 * original — nunca inventa zero nem esconde o dado recebido.
 */
export function formatarQuantidadeParaExibicao(
  unidade: string | null,
  valor: ValorQuantidade,
): string {
  const texto = String(valor)
  if (texto.trim() === '') return texto
  const rotulo = unidade === null ? null : rotuloUnidade(unidade)
  if (rotulo === null) return texto
  try {
    return formatarQuantidade(rotulo, valor)
  } catch {
    return texto
  }
}

/** Soma quantidades da mesma unidade com `Decimal`, sem passar por ponto flutuante. */
export function somarQuantidadesDaUnidade(valores: readonly ValorQuantidade[]): string {
  return valores
    .reduce((total, valor) => total.plus(new Prisma.Decimal(String(valor))), new Prisma.Decimal(0))
    .toString()
}

/** Item mínimo para o resumo por setor, sem acoplar a interface ao contrato completo. */
export interface ItemResumoSetor {
  sectorCode?: string | null
  sectorName?: string | null
  unit: string
  solicitado: ValorQuantidade
  pendente: ValorQuantidade
}

/** Resumo de um setor em uma unidade, com os totais já somados sem perda de precisão. */
export interface ResumoSetorView {
  sectorCode: string | null
  setor: string
  unidade: string | null
  itens: number
  solicitado: string
  pendente: string
}

/**
 * Agrupa por setor e unidade para o resumo do pedido. Unidades diferentes ficam
 * em linhas separadas (RN01, RN02); a soma usa `Decimal` para não introduzir
 * artefatos de ponto flutuante como `20.2999`.
 */
export function agruparPorSetor(itens: readonly ItemResumoSetor[]): ResumoSetorView[] {
  const mapa = new Map<
    string,
    {
      sectorCode: string | null
      setor: string
      unidade: string | null
      itens: number
      solicitado: ValorQuantidade[]
      pendente: ValorQuantidade[]
    }
  >()

  for (const item of itens) {
    const setor = item.sectorName ?? 'Não classificado'
    const unidade = rotuloUnidade(item.unit)
    const chave = `${setor}\u0000${unidade === null ? '' : chaveUnidade(unidade)}`
    const atual = mapa.get(chave) ?? {
      sectorCode: item.sectorCode ?? null,
      setor,
      unidade,
      itens: 0,
      solicitado: [],
      pendente: [],
    }
    atual.itens += 1
    atual.sectorCode ??= item.sectorCode ?? null
    atual.solicitado.push(item.solicitado)
    atual.pendente.push(item.pendente)
    mapa.set(chave, atual)
  }

  return [...mapa.values()].map((grupo) => ({
    sectorCode: grupo.sectorCode,
    setor: grupo.setor,
    unidade: grupo.unidade,
    itens: grupo.itens,
    solicitado: somarQuantidadesDaUnidade(grupo.solicitado),
    pendente: somarQuantidadesDaUnidade(grupo.pendente),
  }))
}
