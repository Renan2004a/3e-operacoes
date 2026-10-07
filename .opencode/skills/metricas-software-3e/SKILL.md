---
name: metricas-software-3e
description: Analisa complexidade, acoplamento e coesão do código 3E nos pontos de maior risco. Use em revisão/refatoração de integração, saldo, produção, permissões ou módulos que cresceram demais. Do NOT use para medir LOC isolado ou justificar refatoração sem evidência.
---
# Métricas de software 3E

Priorizar somente métricas que apoiem decisão concreta:

- Complexidade ciclomática: traduzir em caminhos/testes mínimos.
- Profundidade de aninhamento: >3 níveis é sinal para extração quando melhora clareza.
- Parâmetros por método: ≥5 é smell a investigar.
- Índice de manutenibilidade: usar como sinal, não sentença.
- WMC/LCOM: investigar classes/módulos “faz-tudo”.
- CBO/RFC: prioridade alta em integração com Top Gerente.
- Churn: atenção especial a adapter/conector e regras de saldo.

Nunca recomendar reescrita grande com base em uma métrica isolada; cruzar pelo menos duas evidências e respeitar mudança mínima.
