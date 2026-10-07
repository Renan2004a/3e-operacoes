# Setores e Classificação de Itens — Especificação

## Problem Statement

Depois da importação, os itens chegam sem categoria utilizável, porque `cad_produto` está vazia na instância AWS. Sem classificar, o item não entra em nenhuma fila de setor. Precisamos manter os setores operacionais, um de/para categoria → setor configurável e a classificação de itens pendentes, com auditoria.

## Goals

- [ ] Manter os setores operacionais (Corte e Dobra, Telhas, Revenda).
- [ ] Manter o de/para categoria → setor, configurável e auditável.
- [ ] Classificar itens `PENDING_CLASSIFICATION`.
- [ ] Registrar toda alteração de mapeamento em `AuditLog`.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Geração de atividades e fila por setor | Próxima feature (RF003). |
| Autenticação e perfis | Feature própria; a rota assume contexto autenticado. |
| Interface de usuário | Fora desta fatia. |
| Produção, ocorrências e entregas | Features seguintes. |
| Alterar categoria no Top Gerente | Proibido pela arquitetura. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Categoria do legado indisponível | Item sem categoria permanece `PENDING_CLASSIFICATION` | `cad_produto` vazia na AWS | não |
| Chave do mapeamento | `categoriaLegado` (string) | Fonte oficial é a categoria do legado | não |
| Classificação manual sem categoria | Atribui o setor direto ao item, sem criar mapeamento | Não há categoria para mapear | não |
| Reclassificação de item | Rejeitada com conflito quando já `CLASSIFIED` | Evita mudança silenciosa de setor | não |
| Setores | Entidade com `active`; inativar não apaga | Histórico preservado | sim |
| Autorização | Assume usuário autorizado (auth fora do escopo) | Decisão aprovada | sim |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Gerenciar setores ⭐ MVP

**User Story**: Como responsável pelo sistema, quero manter os setores operacionais, para direcionar corretamente os itens.

**Why P1**: Sem setores não existe destino para a classificação.

**Acceptance Criteria**:

1. WHEN um usuário autorizado cria um setor com código único THEN o sistema SHALL persistir o setor como ativo.
2. IF o código do setor já existir THEN o sistema SHALL rejeitar a criação com conflito.
3. WHEN um usuário autorizado inativa um setor THEN o sistema SHALL marcar o setor como inativo sem apagá-lo.
4. The system SHALL listar por padrão apenas setores ativos.

**Independent Test**: Criar, listar e inativar um setor e conferir o estado.

---

### P1: Manter o de/para categoria → setor ⭐ MVP

**User Story**: Como responsável pelo sistema, quero mapear categoria → setor, para classificar importações futuras automaticamente.

**Why P1**: É o mecanismo que evita reclassificação manual repetida.

**Acceptance Criteria**:

1. WHEN um usuário autorizado cria um mapeamento categoria → setor THEN o sistema SHALL persistir o mapeamento ativo e registrar em `AuditLog`.
2. WHEN um mapeamento existente é alterado THEN o sistema SHALL registrar o valor anterior e o novo em `AuditLog`.
3. IF a categoria já tiver mapeamento ativo THEN o sistema SHALL rejeitar a criação com conflito.
4. The system SHALL permitir no máximo um mapeamento ativo por categoria.

**Independent Test**: Mapear "Telhas" → Telhas, reimportar e ver o item classificado.

---

### P1: Classificar item pendente ⭐ MVP

**User Story**: Como usuário autorizado, quero classificar um item pendente, para liberá-lo para o setor correto.

**Why P1**: É o que destrava o item para a operação.

**Acceptance Criteria**:

1. WHEN um item está `PENDING_CLASSIFICATION` e sua categoria tem mapeamento ativo THEN o sistema SHALL marcar o item como `CLASSIFIED` no setor do mapeamento.
2. WHEN um usuário autorizado classifica um item manualmente THEN o sistema SHALL marcar o item como `CLASSIFIED` no setor informado.
3. WHEN a classificação manual informa a categoria do item THEN o sistema SHALL criar ou atualizar o mapeamento para importações futuras.
4. IF o item já estiver `CLASSIFIED` THEN o sistema SHALL rejeitar a nova classificação com conflito.
5. IF a categoria do item não tiver mapeamento ativo THEN o sistema SHALL manter o item em `PENDING_CLASSIFICATION`.

**Independent Test**: Classificar um item pendente e ver o setor associado.

---

### P2: Auditar alterações de mapeamento

**User Story**: Como responsável pelo sistema, quero auditar as mudanças de mapeamento, para rastrear quem alterou o quê.

**Why P2**: O mapeamento afeta a classificação de todos os itens futuros.

**Acceptance Criteria**:

1. WHEN um mapeamento é criado, alterado ou inativado THEN o sistema SHALL registrar em `AuditLog` o usuário, a ação, a entidade e o antes/depois.

**Independent Test**: Alterar um mapeamento e ver o registro em `AuditLog`.

---

## Edge Cases

- IF o setor informado não existir ou estiver inativo THEN o sistema SHALL rejeitar a classificação.
- IF a categoria não tiver mapeamento THEN o sistema SHALL manter o item em `PENDING_CLASSIFICATION`.
- WHEN dois itens da mesma categoria são classificados THEN o sistema SHALL reutilizar um único mapeamento.
- IF o código do setor for vazio THEN o sistema SHALL rejeitar a criação.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| SET-01 | P1: Setores | Design | Done |
| SET-02 | P1: Setores | Design | Done |
| SET-03 | P1: Setores | Design | Done |
| SET-04 | P1: Setores | Design | Done |
| SET-05 | P1: Mapeamento | Design | Pending |
| SET-06 | P1: Mapeamento | Design | Pending |
| SET-07 | P1: Mapeamento | Design | Pending |
| SET-08 | P1: Mapeamento | Design | Pending |
| SET-09 | P1: Classificação | Design | Pending |
| SET-10 | P1: Classificação | Design | Pending |
| SET-11 | P1: Classificação | Design | Pending |
| SET-12 | P1: Classificação | Design | Pending |
| SET-13 | P1: Classificação | Design | Pending |
| SET-14 | P2: Auditoria | Design | Pending |
| SET-15 | Edge: setor inativo | Design | Pending |
| SET-16 | Edge: sem mapeamento | Design | Pending |
| SET-17 | Edge: categoria reutilizada | Design | Pending |
| SET-18 | Edge: código vazio | Design | Done |

**Coverage:** 18 total, 0 mapped to tasks, 18 unmapped ⚠️

---

## Success Criteria

- [ ] Os três setores existem e podem ser inativados sem perder histórico.
- [ ] Um mapeamento categoria → setor classifica automaticamente os itens daquela categoria.
- [ ] Item sem mapeamento permanece pendente.
- [ ] Toda alteração de mapeamento tem registro em `AuditLog`.
