# Perfis e permissões

| Perfil | Consulta | Alterações principais |
|---|---|---|
| Operador | Atividades dos setores aos quais pertence | execução, status permitido, ocorrências |
| Gerente de Produção | Todos os pedidos e setores | status, prioridade, prazo, exceções e entregas |
| Vendedor | Todos os pedidos | somente prazo de entrega; produção permanece leitura |
| Expedição | Itens disponíveis e histórico | entregas totais/parciais |
| Responsável pelo Sistema | cadastros administrativos | usuários, setores, perfis e permissões |
| Responsável Técnico | integração, jobs e logs | ações técnicas autorizadas |

## Associação a setores

Usuário ↔ setor é muitos-para-muitos. Um operador pode atuar em Corte e Dobra, Telhas e/ou Revenda conforme cadastro.

## Exceção de entrega

Se quantidade entregue > disponível:

1. bloquear por padrão;
2. somente gerente pode autorizar;
3. exigir motivo;
4. registrar pedido/item, disponível anterior, quantidade solicitada para entrega, gerente, data/hora e correlação da operação.
