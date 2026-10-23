# Perfis e permissões

| Perfil | Consulta | Alterações principais |
|---|---|---|
| Operador | Atividades dos setores aos quais pertence | execução, status permitido, ocorrências |
| Gerente de Produção | Todos os pedidos e setores | status, prioridade, prazo, exceções, entregas, remessas programadas e correção justificada de setor |
| Vendedor | Todos os pedidos | prazo de entrega, desmembramento (classificação por setor), correção de setor sem registros operacionais, remessas programadas e solicitação de importação de pedido pelo número; demais ações de produção permanecem leitura |
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

## Solicitação de importação

Ação `solicitar_importacao` (matriz vigente em `src/modules/usuarios/permissoes.ts`): Gerente de Produção, Responsável Técnico, Responsável pelo Sistema e Vendedor. O usuário autenticado que solicitou a importação deve ser registrado (aprovado em 2026-10-22; implementação pendente).

## Prazos (AD-009)

- **Leitura** de `OrderItem.deadlineAt` e `Activity.deadlineAt`: perfis com `consultar_pedidos` (todos os perfis autenticados). É leitura de dado já exibido no detalhe do pedido, não ampliação de escrita.
- **Escrita do prazo de entrega** (`OrderItem.deadlineAt`): `definir_prazo` (Gerente de Produção e Vendedor). A matriz não mudou.
- **Prazo operacional** (`Activity.deadlineAt`): a interface desta etapa é somente leitura (D5). A rota de escrita existente é preservada, mas não há tela de edição.
- Nenhum perfil recebeu permissão nova. Operador e Expedição continuam sem alterar prazos.

## Limites do Vendedor

- Não altera quantidade executada, ocorrência, entrega nem status de produção (já documentado acima).
- Prazo, desmembramento, correção de setor e remessas: permanecem conforme as decisões registradas em `.specs/STATE.md` (AD-003, AD-004, AD-006, AD-007).

## Pendências de permissão (não aprovadas)

- **Remessas (D6):** quem confirma, remoção de remessa confirmada e auditoria. O comportamento atual é mantido até decisão formal.
- **Divergências (D7):** proposta de responsabilidade do Gerente de Produção para divergências operacionais, do Responsável Técnico para falhas de integração e de aviso de leitura ao Vendedor. Não há fluxo de resolução nem nova permissão aprovados.
