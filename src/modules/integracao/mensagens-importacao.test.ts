import { describe, expect, it } from 'vitest'
import {
  codigoFalhaAtual,
  mensagemFalhaImportacao,
  mensagemSucessoImportacao,
  sucessoFoiReimportacao,
} from './mensagens-importacao'

describe('mensagemFalhaImportacao', () => {
  it('orienta a conferir o número do Top Gerente quando o pedido não existe', () => {
    const mensagem = mensagemFalhaImportacao('ORDER_NOT_FOUND')

    expect(mensagem.titulo).toBe('Pedido não encontrado no Top Gerente')
    expect(mensagem.mensagem).toContain('pode ser diferente do número no 3E')
  })

  it('explica indisponibilidade da integração sem expor apenas o código', () => {
    for (const codigo of ['CONNECTOR_UNAVAILABLE', 'CONNECTOR_HTTP_ERROR', 'DISPATCH_FAILED']) {
      const mensagem = mensagemFalhaImportacao(codigo)

      expect(mensagem.titulo).toBe('Integração com o Top Gerente indisponível')
      expect(mensagem.mensagem).not.toContain(codigo)
    }
  })

  it('distingue timeout de indisponibilidade', () => {
    expect(mensagemFalhaImportacao('CONNECTOR_TIMEOUT').titulo).toBe(
      'A integração com o Top Gerente demorou demais',
    )
  })

  it('explica falha ao salvar os dados importados', () => {
    const mensagem = mensagemFalhaImportacao('UPSERT_FAILED')

    expect(mensagem.titulo).toBe('Falha ao salvar os dados importados')
    expect(mensagem.mensagem).toContain('localizado no Top Gerente')
  })

  it('usa mensagem genérica para código desconhecido ou ausente', () => {
    expect(mensagemFalhaImportacao(null).titulo).toBe('Não foi possível importar o pedido')
    expect(mensagemFalhaImportacao('CODIGO_NOVO').titulo).toBe('Não foi possível importar o pedido')
  })
})

describe('mensagemSucessoImportacao', () => {
  it('distingue importação nova de reimportação', () => {
    expect(mensagemSucessoImportacao(false).titulo).toBe('Importação concluída')
    expect(mensagemSucessoImportacao(true).titulo).toBe('Pedido atualizado')
    expect(mensagemSucessoImportacao(true).mensagem).toContain('histórico operacional')
  })
})

describe('codigoFalhaAtual', () => {
  it('usa o errorCode atual e ignora falhas antigas do mesmo job', () => {
    const codigo = codigoFalhaAtual('FAILED', 'CONNECTOR_UNAVAILABLE', [
      { type: 'FAILED', detail: 'UPSERT_FAILED' },
      { type: 'RETRY', detail: 'CONNECTOR_UNAVAILABLE (tentativa 1/3)' },
      { type: 'FAILED', detail: 'CONNECTOR_UNAVAILABLE' },
    ])

    expect(codigo).toBe('CONNECTOR_UNAVAILABLE')
  })

  it('usa a última falha como compatibilidade quando o job não traz errorCode', () => {
    const codigo = codigoFalhaAtual('FAILED', null, [
      { type: 'FAILED', detail: 'UPSERT_FAILED' },
      { type: 'FAILED', detail: 'CONNECTOR_TIMEOUT' },
    ])

    expect(codigo).toBe('CONNECTOR_TIMEOUT')
  })

  it('não devolve código quando o status não é FAILED', () => {
    expect(codigoFalhaAtual('SUCCEEDED', 'CONNECTOR_TIMEOUT', [])).toBeNull()
  })
})

describe('sucessoFoiReimportacao', () => {
  it('reconhece a reimportação pelo evento mais recente de sucesso', () => {
    expect(
      sucessoFoiReimportacao('SUCCEEDED', [
        { type: 'SUCCEEDED', detail: 'IMPORTED' },
        { type: 'SUCCEEDED', detail: 'REIMPORTED' },
      ]),
    ).toBe(true)
  })

  it('não é reimportação quando o status não é sucesso', () => {
    expect(sucessoFoiReimportacao('FAILED', [{ type: 'SUCCEEDED', detail: 'REIMPORTED' }])).toBe(
      false,
    )
  })
})
