# Agentes e subagentes — o que cada um fez no projeto

Este documento resume os **agentes/subagentes** usados no desenvolvimento do 3E Operações e o papel de cada um. Complementa [`docs/subagentes.md`](subagentes.md) (estratégia) e [`docs/governanca-agentes.md`](governanca-agentes.md) (hierarquia).

## Papéis no fluxo

| Papel | Quem é | O que fez |
| --- | --- | --- |
| **Orquestrador** | Agente principal (sessão do OpenCode) | Especificou, planejou, integrou resultados, tomou decisões, criou commits e conduziu a verificação. |
| **Batch worker** | Subagente `general` | Executou lotes de tarefas de uma feature (implementar → gate → commit atômico). Não cria sub-subagentes. |
| **Verifier** | Subagente independente (autor ≠ verificador) | Revalidou cada feature: checagem por critério de aceitação com evidência `arquivo:linha`, **sensor de discriminação** (mutantes) e escrita do `validation.md`. |

> O subagente `.opencode/agents/verifier.md` tem edição bloqueada; como o protocolo `tlc-spec-driven` exige que o Verifier **escreva** o relatório, a verificação foi executada por um subagente `general` no papel de Verifier.

## Subagentes especializados disponíveis (`.opencode/agents/`)

| Subagente | Foco | Uso previsto |
| --- | --- | --- |
| `domain-reviewer` | Requisitos, regras de negócio e decisões do domínio | Revisar saldo, unidade, perda/refugo, prazo, setor e permissões. |
| `integration-reviewer` | Integração com o Top Gerente e conector | Revisar jobs, idempotência, retries, somente leitura e reconciliação. |
| `security-reviewer` | Segurança | Autenticação, autorização, segredos, entradas, logs e integração. |
| `test-reviewer` | Testes | Critérios de aceitação, lacunas e testes que espelham a implementação. |
| `frontend-reviewer` | Interface | Responsividade, usabilidade de chão de fábrica e acessibilidade. |
| `verifier` | Verificação final | Confirmação independente com evidência antes de aceitar a conclusão. |

No backlog (`docs/backlog.md`) cada fase indica o **Revisor** sugerido (ex.: Fase 2 → `integration-reviewer` + `security-reviewer`; Fase 3 → `domain-reviewer`; Fase 9 → `frontend-reviewer`).

## Como foi usado por feature

O desenvolvimento seguiu o `tlc-spec-driven`: o orquestrador escrevia **spec → design → tasks**; um **batch worker** executava as tarefas; um **Verifier independente** validava. Quando o Verifier reprovava, um worker de correção ajustava e o Verifier re-rodava.

| Feature | Execução (batch) | Verificação |
| --- | --- | --- |
| 1 — Importação de pedido | T1–T8, T9–T17 | FAIL → correções T18–T23 → **PASS** |
| 2 — Setores e classificação | T1–T9 | FAIL → correções T10–T13 → **PASS** |
| 3 — Produção e fila | T1–T7, T8–T11 | **PASS** |
| 4 — Ocorrências | T1–T7 | **PASS** |
| 5 — Disponibilidade e entregas | T1–T7 | **PASS** |
| 6 — Usuários e permissões | T1–T8, T9–T15 | FAIL (AUTH-14) → correções T16–T20 → **PASS** |
| 7 — Prazos e alertas | T1–T7 | **PASS** |
| 8 — Indicadores e consulta | T1–T7 | **PASS** |
| 9 — Frontend (fundação) | T1–T8 | PASS → correção T9 (fail-open) → **PASS** |
| 10 — Frontend (perfis) | T1–T8, T9–T10 | **PASS** |
| 11 — Qualidade e go-live | T1–T7 | **PASS** |
| 12 — Refino visual | T1–T7 | **PASS** |

## O que a verificação independente garantiu

- **Evidência-or-zero**: cada critério de aceitação mapeado a um `arquivo:linha` com a asserção.
- **Sensor de discriminação**: mutações de comportamento injetadas em cópia isolada (nunca `git stash`); os testes precisam matá-las.
- **Autor ≠ verificador**: quem escreveu o código não validou o próprio trabalho.
- **Fechamento determinístico**: `validate_state.py` só passa com `validation.md` em PASS e com evidência.

## Boas práticas adotadas

- Um objetivo por subagente; o orquestrador integra.
- Nunca dois subagentes escrevendo o mesmo arquivo ao mesmo tempo.
- Lotes por fase (≈7 tarefas por worker), sequenciais.
- Verificação sempre ao final da feature, automática.
