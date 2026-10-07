---
name: tdd-3e
description: Aplica TDD aos comportamentos críticos do 3E. Use ao implementar regras de quantidade, saldo, disponibilidade, perdas/refugos, permissões, prazos, entregas ou sincronização. Do NOT use para alterações puramente visuais/documentais.
---
# TDD 3E

Leia `docs/regras-negocio.md`, `docs/testes.md` e a spec da feature.

1. Derivar teste do critério de aceitação/regra, não do código existente.
2. Criar teste que falha pelo motivo esperado.
3. Implementar a menor alteração.
4. Executar testes.
5. Refatorar preservando comportamento.
6. Cobrir limites/entradas inválidas.
7. Executar suíte pertinente antes de concluir.

Priorizar: solicitado/executado/entregue; perda e refugo não satisfazendo demanda; entrega parcial; exceções; múltiplos setores; prazo opcional; idempotência e atualização do pedido legado.
