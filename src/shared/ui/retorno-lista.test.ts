import { describe, expect, it } from 'vitest'
import { caminhoDaListagemAtual, montarUrlDetalhe, resolverRetornoListagem } from './retorno-lista'

const LISTA_VENDEDOR = '/vendedor/pedidos'

function urlRelativa(valor: string): URL {
  return new URL(valor, 'http://interno.local')
}

describe('resolverRetornoListagem', () => {
  it('usa a listagem padrão quando não há contexto', () => {
    expect(resolverRetornoListagem(null, LISTA_VENDEDOR)).toBe(LISTA_VENDEDOR)
    expect(resolverRetornoListagem('', LISTA_VENDEDOR)).toBe(LISTA_VENDEDOR)
    expect(resolverRetornoListagem(undefined, LISTA_VENDEDOR)).toBe(LISTA_VENDEDOR)
  })

  it('preserva pesquisa, filtros combinados e página', () => {
    const retorno =
      '/vendedor/pedidos?numero=70435&cliente=Jo%C3%A3o%20%26%20Cia&setor=TELHAS&status=IN_PROGRESS&de=2026-10-01&ate=2026-10-31&pagina=2'

    const destino = urlRelativa(resolverRetornoListagem(retorno, LISTA_VENDEDOR))

    expect(destino.pathname).toBe(LISTA_VENDEDOR)
    expect(destino.searchParams.get('numero')).toBe('70435')
    expect(destino.searchParams.get('cliente')).toBe('João & Cia')
    expect(destino.searchParams.get('setor')).toBe('TELHAS')
    expect(destino.searchParams.get('status')).toBe('IN_PROGRESS')
    expect(destino.searchParams.get('de')).toBe('2026-10-01')
    expect(destino.searchParams.get('ate')).toBe('2026-10-31')
    expect(destino.searchParams.get('pagina')).toBe('2')
  })

  it('remove parâmetro retorno aninhado e colapsa parâmetros duplicados', () => {
    const retorno =
      '/vendedor/pedidos?setor=TELHAS&setor=CORTE_DOBRA&cliente=Ana&retorno=https%3A%2F%2Fevil.example'

    const destino = urlRelativa(resolverRetornoListagem(retorno, LISTA_VENDEDOR))

    expect(destino.searchParams.getAll('setor')).toEqual(['CORTE_DOBRA'])
    expect(destino.searchParams.get('cliente')).toBe('Ana')
    expect(destino.searchParams.has('retorno')).toBe(false)
  })

  it('rejeita origem externa, esquema arbitrário e outra rota interna', () => {
    for (const retorno of [
      'https://evil.example/vendedor/pedidos',
      '//evil.example/vendedor/pedidos',
      'javascript:alert(1)',
      '/gerente/pedidos?cliente=Ana',
      '/vendedor/pedidos/../admin/usuarios',
      'vendedor/pedidos?cliente=Ana',
      '/vendedor/pedidos-extra?cliente=Ana',
    ]) {
      expect(resolverRetornoListagem(retorno, LISTA_VENDEDOR)).toBe(LISTA_VENDEDOR)
    }
  })

  it('aceita o basePath de outro perfil quando ele é o destino permitido', () => {
    expect(resolverRetornoListagem('/gerente/pedidos?cliente=Ana', '/gerente/pedidos')).toBe(
      '/gerente/pedidos?cliente=Ana',
    )
    expect(resolverRetornoListagem('/vendedor/pedidos?cliente=Ana', '/gerente/pedidos')).toBe(
      '/gerente/pedidos',
    )
  })
})

describe('caminhoDaListagemAtual', () => {
  it('normaliza a query atual e remove retorno/nomes repetidos', () => {
    expect(
      caminhoDaListagemAtual(
        LISTA_VENDEDOR,
        '?cliente=Ana&setor=TELHAS&setor=CORTE_DOBRA&retorno=%2Fvendedor%2Fpedidos',
      ),
    ).toBe('/vendedor/pedidos?cliente=Ana&setor=CORTE_DOBRA')
  })
})

describe('montarUrlDetalhe', () => {
  it('codifica o contexto de retorno na URL do detalhe', () => {
    const url = montarUrlDetalhe(
      LISTA_VENDEDOR,
      'pedido_1',
      '/vendedor/pedidos?cliente=Jo%C3%A3o%20%26%20Cia&pagina=2',
    )

    const detalhe = urlRelativa(url)
    expect(detalhe.pathname).toBe('/vendedor/pedidos/pedido_1')
    expect(detalhe.searchParams.get('retorno')).toBe(
      '/vendedor/pedidos?cliente=Jo%C3%A3o+%26+Cia&pagina=2',
    )
    expect(detalhe.searchParams.getAll('retorno')).toHaveLength(1)
  })

  it('não adiciona retorno quando o contexto é vazio ou inválido', () => {
    expect(montarUrlDetalhe(LISTA_VENDEDOR, 'pedido_1', '')).toBe('/vendedor/pedidos/pedido_1')
    expect(montarUrlDetalhe(LISTA_VENDEDOR, 'pedido_1', 'https://evil.example')).toBe(
      '/vendedor/pedidos/pedido_1',
    )
    expect(montarUrlDetalhe(LISTA_VENDEDOR, 'pedido_1', '/gerente/pedidos?cliente=Ana')).toBe(
      '/vendedor/pedidos/pedido_1',
    )
  })

  it('preserva a página maior que 1 no contexto', () => {
    const detalhe = urlRelativa(
      montarUrlDetalhe(LISTA_VENDEDOR, 'pedido_1', '/vendedor/pedidos?pagina=3'),
    )
    const retorno = detalhe.searchParams.get('retorno') ?? ''
    expect(urlRelativa(retorno).searchParams.get('pagina')).toBe('3')
  })
})
