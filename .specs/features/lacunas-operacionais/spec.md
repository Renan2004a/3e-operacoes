# Lacunas Operacionais — Especificação

## Problem Statement

O sistema está funcional, mas quatro pontos impedem o uso 100% pela interface e a robustez da integração: (1) **importar pedido** e (2) **classificar item** só existem por API; (3) a **ordem de produção** (RF018) não tem tela/impressão; (4) o **Responsável Técnico** não tem tela de integração/logs (RF016/RF017); e (5) o despacho ao conector **não tem retry**, então um timeout transitório já marca o job como `FAILED`.

## Goals

- [ ] Tela de **importar pedido** por número (com status do job).
- [ ] Tela de **classificar item** no detalhe do pedido.
- [ ] **Ordem de produção** com visualização e **impressão** (RF018).
- [ ] Tela do **Responsável Técnico**: jobs de integração e eventos (RF016/RF017).
- [ ] **Retry com backoff** no despacho antes de marcar `FAILED`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| PWA offline por tablet | Opção B; depois. |
| Mapa categoria→setor automático | Depende de dado do cliente. |
| Notificações externas | Fora do escopo. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Retry | 3 tentativas, backoff 1s, só erros transitórios | Reduz `FAILED` falso | sim |
| Classificação | Usa a lista de setores via API do responsável | Sem nova API | não |
| Impressão | CSS `@media print` + botão | RF018 | sim |
| Técnico | Lista jobs + eventos | RF016/RF017 | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Importar pedido pela interface ⭐ MVP

**Acceptance Criteria**:

1. WHEN o usuário informa o número e confirma THEN a tela SHALL chamar a importação e mostrar o status do job.
2. IF o número for inválido THEN SHALL mostrar erro sem chamar a API.
3. The tela SHALL atualizar o status até concluir (sucesso/falha).

### P1: Classificar item pela interface ⭐ MVP

**Acceptance Criteria**:

1. WHEN o detalhe do pedido mostra item pendente THEN SHALL permitir escolher o setor e classificar.
2. IF o item já estiver classificado THEN SHALL indicar e não repetir.
3. The tela SHALL refletir o item classificado após a ação.

### P1: Ordem de produção ⭐ MVP

**Acceptance Criteria**:

1. WHEN a ordem de uma atividade é aberta THEN SHALL mostrar pedido, item, setor, solicitado, executado e pendente.
2. WHEN o usuário aciona imprimir THEN SHALL usar o estilo de impressão (sem menu).

### P1: Tela do Responsável Técnico ⭐ MVP

**Acceptance Criteria**:

1. WHEN o técnico abre a tela THEN SHALL listar os jobs de integração com status e erros.
2. WHEN um job é selecionado THEN SHALL mostrar seus eventos.

### P1: Retry no despacho ⭐ MVP

**Acceptance Criteria**:

1. WHEN o conector falha de forma transitória THEN o sistema SHALL tentar novamente até o limite antes de marcar `FAILED`.
2. IF a falha for definitiva (ex.: pedido inexistente) THEN SHALL marcar `FAILED` sem repetir.
3. The tentativas SHALL ser registradas em evento do job.

---

## Edge Cases

- IF a importação falhar THEN a tela SHALL mostrar o `errorCode`.
- IF a lista de jobs estiver vazia THEN SHALL mostrar o estado vazio.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| LAC-01 | P1: Importar | Design | Done |
| LAC-02 | P1: Importar | Design | Done |
| LAC-03 | P1: Importar | Design | Done |
| LAC-04 | P1: Classificar | Design | Done |
| LAC-05 | P1: Classificar | Design | Done |
| LAC-06 | P1: Classificar | Design | Done |
| LAC-07 | P1: Ordem | Design | Done |
| LAC-08 | P1: Ordem | Design | Done |
| LAC-09 | P1: Técnico | Design | Done |
| LAC-10 | P1: Técnico | Design | Done |
| LAC-11 | P1: Retry | Design | Done |
| LAC-12 | P1: Retry | Design | Done |
| LAC-13 | P1: Retry | Design | Done |

**Coverage:** 13 total, 13 mapped to tasks, 0 unmapped ✅ (T1–T8; LAC-01/LAC-07/LAC-09 com E2E do guarda de sessão)

---

## Success Criteria

- [ ] Importar e classificar pela interface.
- [ ] Ordem de produção visualizável e imprimível.
- [ ] Técnico vê jobs e eventos.
- [ ] Despacho com retry; menos `FAILED` falso.
