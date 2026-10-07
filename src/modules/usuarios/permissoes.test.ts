import { describe, expect, it } from 'vitest'
import { TODOS_PERFIS, pode } from './permissoes'

describe('pode', () => {
  it('permite consultar_pedidos a todos os perfis', () => {
    for (const perfil of TODOS_PERFIS) {
      expect(pode([perfil], 'consultar_pedidos')).toBe(true)
    }
  })

  it('Vendedor só consulta e define prazo, não registra execução', () => {
    expect(pode(['SELLER'], 'consultar_pedidos')).toBe(true)
    expect(pode(['SELLER'], 'definir_prazo')).toBe(true)
    expect(pode(['SELLER'], 'registrar_execucao')).toBe(false)
    expect(pode(['SELLER'], 'registrar_entrega')).toBe(false)
  })

  it('Operador registra execução e ocorrência, mas não define prioridade', () => {
    expect(pode(['OPERATOR'], 'registrar_execucao')).toBe(true)
    expect(pode(['OPERATOR'], 'registrar_ocorrencia')).toBe(true)
    expect(pode(['OPERATOR'], 'definir_prioridade')).toBe(false)
  })

  it('Gerente de Produção faz as ações de produção e entrega', () => {
    for (const acao of [
      'registrar_execucao',
      'registrar_ocorrencia',
      'definir_prioridade',
      'registrar_entrega',
      'autorizar_excecao',
      'classificar_item',
      'solicitar_importacao',
      'definir_prazo',
    ]) {
      expect(pode(['PRODUCTION_MANAGER'], acao)).toBe(true)
    }
  })

  it('Expedição registra entrega, mas não autoriza exceção', () => {
    expect(pode(['SHIPPING'], 'registrar_entrega')).toBe(true)
    expect(pode(['SHIPPING'], 'autorizar_excecao')).toBe(false)
  })

  it('Responsável pelo Sistema gerencia cadastros e integração', () => {
    for (const acao of [
      'gerenciar_usuarios',
      'gerenciar_setores',
      'classificar_item',
      'solicitar_importacao',
      'monitorar_integracao',
    ]) {
      expect(pode(['SYSTEM_RESPONSIBLE'], acao)).toBe(true)
    }
  })

  it('Responsável Técnico monitora integração, mas não gerencia usuários', () => {
    expect(pode(['TECHNICAL_RESPONSIBLE'], 'monitorar_integracao')).toBe(true)
    expect(pode(['TECHNICAL_RESPONSIBLE'], 'solicitar_importacao')).toBe(true)
    expect(pode(['TECHNICAL_RESPONSIBLE'], 'gerenciar_usuarios')).toBe(false)
  })

  it('nega quando o usuário não tem perfil', () => {
    expect(pode([], 'consultar_pedidos')).toBe(false)
  })

  it('nega ação desconhecida por padrão', () => {
    expect(pode(['SYSTEM_RESPONSIBLE'], 'acao_inexistente')).toBe(false)
  })
})
