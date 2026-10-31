import type { Prisma } from '@/generated/prisma/client'
import { prisma } from '@/shared/db/prisma'
import type { UnidadeTrabalhoClassificacao } from '../classificar-item'
import { criarClassificacaoEmTransacao } from './prisma-classificacao-repository'
import { criarMapeamentoEmTransacao } from './prisma-setores-repository'

/**
 * Limite pequeno de repetições da unidade completa. No máximo duas tentativas
 * extras; erros permanentes nunca são repetidos e permanecem visíveis.
 */
const LIMITE_TENTATIVAS = 3

function erroPrismaDe(erro: unknown): { code?: unknown; target?: unknown } | null {
  if (typeof erro !== 'object' || erro === null) return null
  const { code, meta } = erro as { code?: unknown; meta?: { target?: unknown } }
  if (code === undefined) return null
  return { code, target: meta?.target }
}

/**
 * `P2034`: conflito de escrita, deadlock ou falha de serialização da
 * transação interativa (MySQL `ER_LOCK_DEADLOCK` / `ER_LOCK_WAIT_TIMEOUT`).
 * Erro transatório identificado: a unidade completa pode ser repetida.
 */
function ehDeadlockOuConflitoDeEscrita(erro: unknown): boolean {
  return erroPrismaDe(erro)?.code === 'P2034'
}

/**
 * `P2002` identificado na chave única da categoria do mapeamento
 * (`mapeamentos_categoria_setor`: `legacyCategory`): ocorre quando duas
 * transações criam a mesma categoria nova e uma perde a corrida de inserção
 * para a outra. Transatório por design: ao repetir a unidade, a leitura
 * bloqueante (`SELECT ... FOR UPDATE`) encontra o mapeamento ativo vencedor no
 * estado atual e o reutiliza sem auditar. Outros `P2002` não são repetidos —
 * a violação da atividade única já virou conflito de domínio no escopo.
 */
function ehCategoriaDuplicada(erro: unknown): boolean {
  const erroPrisma = erroPrismaDe(erro)
  if (!erroPrisma || erroPrisma.code !== 'P2002') return false

  const target = erroPrisma.target
  if (Array.isArray(target)) return target.includes('value') || target.includes('matchType')
  if (typeof target === 'string') return target.includes('value') || target.includes('tipo_correspondencia')
  return false
}

/** Conflitos transatórios identificados que autorizam repetir a unidade. */
function ehConflitoTransitorio(erro: unknown): boolean {
  return ehDeadlockOuConflitoDeEscrita(erro) || ehCategoriaDuplicada(erro)
}

/**
 * Unidade transacional da classificação manual (V06): cada `transacional` abre
 * uma transação interativa do Prisma — uma transação MySQL real de escopo
 * único, no isolamento padrão (REPEATABLE READ) — e entrega as portas de
 * classificação e de mapeamento ligadas ao MESMO cliente transacional. Não há
 * transações aninhadas na lógica de domínio: nenhum método do escopo abre
 * transação própria e nenhuma operação decisiva escapa para o `prisma` global.
 *
 * Conflitos transatórios (deadlock/conflito de escrita ou categoria nova
 * disputada por itens distintos) repetem a UNIDADE COMPLETA — transição,
 * leitura autoritativa, mapeamento, auditoria e atividade — com clientes
 * novos, até o limite pequeno definido acima. Conflitos definitivos
 * (`409`, `404`, `400`), erros permanentes e falhas de auditoria propagam sem
 * repetição.
 */
export const prismaUnidadeTrabalhoClassificacao: UnidadeTrabalhoClassificacao = {
  async transacional(fn) {
    let ultimoErro: unknown
    for (let tentativa = 1; tentativa <= LIMITE_TENTATIVAS; tentativa += 1) {
      try {
        return await prisma.$transaction(
          async (tx: Prisma.TransactionClient) =>
            fn({
              classificacao: criarClassificacaoEmTransacao(tx),
              mapeamento: criarMapeamentoEmTransacao(tx),
            }),
        )
      } catch (erro) {
        ultimoErro = erro
        if (!ehConflitoTransitorio(erro) || tentativa === LIMITE_TENTATIVAS) {
          throw erro
        }
      }
    }
    /* istanbul ignore next -- inalcançável: o laço sempre retorna ou lançou. */
    throw ultimoErro
  },
}
