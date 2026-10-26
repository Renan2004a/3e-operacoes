# Diagnóstico e melhorias — Perfil Operador

**Data**: 2026-10-26
**Escopo**: perfil Operador (fila, execução, ocorrências) e visão das ocorrências no painel do Gerente de Produção.
**Base**: inspeção do código/specs, execução local, banco de desenvolvimento (MySQL) e Playwright.

---

## 1. O que foi inspecionado

| Camada | Evidência |
| --- | --- |
| Telas | `/operador/fila`, `/operador/atividades/[id]`, `/producao/atividades/[id]/ordem` |
| Componentes | `OcorrenciaForm`, `AppShell`, `navegacao-perfil`, `pedido-detalhe` (gerente) |
| API | `/api/producao/atividades`, `.../[id]/ordem`, `.../[id]/execucoes`, `.../[id]/ocorrencias`, `/api/motivos` |
| Domínio | `producao/*`, `ocorrencias/*`, `usuarios/permissoes` |
| Banco | `ocorrencias`, `atividades`, `pedidos_itens`, `pedidos`, `setores`, `usuarios`, `motivos_ocorrencia` |
| Gerente | `/gerente/painel` + `/api/indicadores`, `/api/indicadores/alertas` |
| Testes | suíte Vitest (unit/integração) e validação Playwright |

---

## 2. Diagnóstico (antes)

| # | Problema | Causa | Correção | Status |
| --- | --- | --- | --- | --- |
| 1 | Operador tinha só a fila; execução, ocorrência e ordem na mesma página | Tela de atividade acumulava três blocos | Fila virou **Meus pedidos**; ocorrência ganhou **tela própria**; a atividade ficou focada em executar | ✅ |
| 2 | Ocorrência misturada com a execução | `OcorrenciaForm` renderizado dentro da atividade | Formulário movido para `/operador/ocorrencias`, com link a partir da atividade | ✅ |
| 3 | Operador não consultava o histórico das próprias ocorrências | Só existia listagem **por atividade** | Nova tela lista as ocorrências do usuário, com pedido/item/setor/motivo/data | ✅ |
| 4 | **Gerente não via as ocorrências** | Painel só tinha produção/status/prazos/alertas | Card **Ocorrências recentes** + endpoint `/api/indicadores/ocorrencias` | ✅ |
| 5 | Operador não sabia que a ocorrência chega ao gerente | Sem retorno sobre o destino | Texto na tela de ocorrências + card no painel do gerente | ✅ |
| 6 | Navegação do operador com um único item (“Fila”) | Nav mínima | **Pedidos** e **Ocorrências** no menu, com ícones | ✅ |
| 7 | Botão “Abrir” genérico e título “Minha fila” | Texto técnico/curto | “Meus pedidos”, “Abrir atividade”, linguagem simples | ✅ |
| 8 | Sem visão consolidada por tipo/data | Consulta só por atividade | Resumo (total, últimos 7 dias, por tipo) no gerente | ✅ |
| 9 | Situação de “análise/resolução” da ocorrência | **Não existe no modelo/regras** | Não inventada; registrada como lacuna de negócio | ⚠️ decisão |
| 10 | Duplicidade de envio | Sem idempotência explícita na ocorrência | Botão desabilitado durante o envio; formulário preserva os dados em erro | ✅ (mitigado) |

**Não havia problema de persistência**: as ocorrências já eram gravadas em `ocorrencias` com `activityId`, `userId`, `motivoId`, quantidade e data/hora. O vínculo com o pedido é indireto e íntegro: `ocorrencias.activityId → atividades.orderItemId → pedidos_itens.orderId → pedidos`.

---

## 3. Decisão de organização das telas

A proposta inicial (Pedidos / Ocorrências / Detalhes do pedido) foi avaliada. A organização escolhida:

1. **Pedidos** (`/operador/fila`): lista das atividades atribuídas ao operador, com pedido, item, setor, prioridade e status. É o ponto de partida do turno.
2. **Ocorrências** (`/operador/ocorrencias`): registrar e consultar, em uma tela dedicada.
3. **Detalhes/execução** (`/operador/atividades/[id]`): já contém o pedido, o item, a unidade, o saldo, o progresso e a execução. **Não foi criada uma página redundante de “pedido”**, porque a atividade é a unidade operacional que o operador realmente executa (um pedido pode ter vários itens/setores).

Essa divisão reduz a sobrecarga sem criar navegação desnecessária.

---

## 4. Fluxo da informação (operador → banco → gerente)

```text
Operador registra a ocorrência
  → POST /api/producao/atividades/[id]/ocorrencias
  → registrarOcorrencia (valida setor, motivo e unidade)
  → INSERT em ocorrencias (activityId, userId, type, quantity, motivoId, note, occurredAt)
  → GET /api/producao/ocorrencias (visão do próprio operador)
  → GET /api/indicadores/ocorrencias (visão do gerente)
  → card "Ocorrências recentes" no painel do gerente
```

| Dado | Onde fica | Quem vê |
| --- | --- | --- |
| Tipo, quantidade, observação, data/hora | `ocorrencias` | Operador (próprias), gerente (todas) |
| Motivo | `motivos_ocorrencia` (lista fechada) | Operador e gerente |
| Pedido/item/setor | `pedidos` / `pedidos_itens` / `setores` (via atividade) | Operador e gerente |
| Responsável | `usuarios` | Operador (próprias) e gerente |

**Atualização:** ao registrar, a tela recarrega a lista do operador; o painel do gerente busca o resumo ao abrir e pode ser recarregado pelo botão de tentar de novo, sem procedimento extra.

**Permissões:** `registrar_ocorrencia` (Operador e Gerente) para registrar/listar as próprias; `consultar_pedidos` para o resumo do painel. O operador só vê as ocorrências dele (filtro por `userId` da sessão); o gerente vê todas.

---

## 5. UI/UX aplicada

- Linguagem direta: “Meus pedidos”, “Ocorrências”, “Registrar ocorrência”, “Abrir atividade”.
- Botões grandes (≥ 44 px) e com finalidade explícita.
- Formulário curto, com dica no campo de atividade e motivo obrigatório sinalizado.
- Cores + texto (badges por tipo e status), sem depender só da cor.
- Estados de carregamento, vazio, erro e sucesso.
- Layout em cartões, responsivo em 390 px (sem rolagem horizontal).
- Preservação dos campos em caso de erro; botão desabilitado durante o envio.
- Link de volta visível em todas as telas.

---

## 6. Revisão funcional

| Item | Resultado |
| --- | --- |
| Login/redirecionamento do Operador | OK (vai para “Meus pedidos”) |
| Lista de pedidos/atividades | OK (cards com pedido, item, setor, status) |
| Detalhe/execução | OK (saldo, progresso, execução, ordem) |
| Atualização de status pela execução | OK (backend já existente) |
| Registro de ocorrência | OK (persiste; validações do domínio) |
| Consulta de ocorrências | OK (próprias, com pedido/item/setor/motivo/data) |
| Visualização pelo gerente | OK (card no painel com total, 7 dias, por tipo e recentes) |
| Validação de formulários | OK (motivo, quantidade, unidade; erros próximos) |
| Persistência | OK (confirmada no MySQL) |
| Erros de comunicação | OK (alertas + tentar de novo) |
| Navegação/botões | OK (links e voltar) |
| Atualização após operação | OK (lista recarregada) |
| Permissões | OK (operador só as próprias; gerente todas) |
| Responsividade | OK (390 px sem rolagem; validação Playwright) |
| Envio duplicado | Mitigado (botão desabilitado; sem idempotência de negócio) |

---

## 7. Testes executados

| Gate | Resultado |
| --- | --- |
| Lint | 0 erros |
| Typecheck | OK |
| Testes | **1023 verdes** + 24 de integração ignorados |
| Build | OK |
| Playwright (Operador + Gerente) | **9/9** |
| Banco | 13 ocorrências persistidas, com pedido/item/setor/responsável/motivo |

Novos testes: `painel-ocorrencias.test.ts`, `api/producao/ocorrencias/route.test.ts`, `api/indicadores/ocorrencias/route.test.ts`, `operador/ocorrencias/page.test.tsx`; ajustes em `app-shell`, `fila`, `atividade`, `painel` e `navegacao-perfil`.

---

## 8. Lacunas e decisões pendentes

1. **Situação de análise/resolução da ocorrência**: não existe campo nem regra. Não foi inventado. Se o cliente quiser “pendente/em análise/resolvida”, é preciso decidir o fluxo, o responsável e a auditoria (proposta de ADR/backlog).
2. **Idempotência da ocorrência**: não há chave de idempotência; o risco de duplicidade é mitigado pela interface (botão desabilitado). Para volume alto/duplo clique em rede instável, avaliar chave idempotente.
3. **Notificação ativa ao gerente**: o painel mostra o resumo, mas não há alerta em tempo real (push/e-mail). Fora do escopo.
4. **Edição/exclusão de ocorrência**: não prevista nas regras; não implementada.

---

## 9. Arquivos alterados

- `src/app/(app)/operador/ocorrencias/page.tsx` + teste (novo)
- `src/app/(app)/operador/fila/page.tsx` (Meus pedidos) + teste
- `src/app/(app)/operador/atividades/[id]/page.tsx` (link para ocorrências) + teste
- `src/app/(app)/gerente/painel/page.tsx` (card de ocorrências) + teste
- `src/shared/ui/navegacao-perfil.ts` + `app-shell.tsx` (menu/ícone)
- `src/modules/ocorrencias/painel-ocorrencias.ts` + teste (novo)
- `src/modules/ocorrencias/adapters/prisma-ocorrencias-repository.ts` (listagem detalhada)
- `src/app/api/producao/ocorrencias/route.ts` + teste (novo)
- `src/app/api/indicadores/ocorrencias/route.ts` + teste (novo)
- `scripts/validar-operador.mjs` (novo)
