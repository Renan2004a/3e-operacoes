# Usuários, Perfis e Permissões — Especificação

## Problem Statement

Todas as rotas usam um cabeçalho temporário `x-user-id`, sem login nem autorização real. Qualquer um pode se passar por outro usuário e executar ações de qualquer perfil. Precisamos de autenticação com sessão, autorização no servidor pela matriz de perfis e gestão de usuários.

## Goals

- [ ] Login/logout com sessão assinada e senha com hash.
- [ ] Autorização no servidor pela matriz de perfis.
- [ ] CRUD de usuários e associação N:N usuário ↔ setor.
- [ ] Substituir o cabeçalho temporário `x-user-id` pela sessão em todas as rotas.

## Out of Scope

| Feature | Reason |
| --- | --- |
| Recuperação de senha, MFA, OAuth | Fora do escopo atual. |
| Tela de login e cadastro | Fase de frontend. |
| Definir prazo pelo Vendedor | Feature de prazos (a regra fica na matriz). |
| Alertas e notificações | Feature própria. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Mecanismo de sessão | Cookie httpOnly com token assinado (HMAC-SHA256) | Sem dependência nova; portátil | não |
| Hash de senha | `crypto.scrypt` com sal | Sem dependência nova | não |
| Rotas de serviço | Callback do conector mantém `CONNECTOR_CALLBACK_TOKEN`, não sessão | É serviço, não usuário | sim |
| Vendedor | Somente consulta; prazo entra na feature de prazos | `docs/perfis-permissoes.md` | sim |
| Quem classifica item | Gerente de Produção e Responsável pelo Sistema | "usuário autorizado"; ambíguo | não |
| Quem solicita importação | Gerente, Responsável Técnico e Responsável pelo Sistema | Ambíguo na documentação | não |

**Open questions:** none - all resolved or logged above.

---

## User Stories

### P1: Autenticar ⭐ MVP

**User Story**: Como usuário, quero entrar com email e senha, para acessar o sistema conforme meu perfil.

**Why P1**: Sem login não há autorização confiável.

**Acceptance Criteria**:

1. WHEN o usuário informa email e senha válidos THEN o sistema SHALL criar uma sessão e responder `200`.
2. IF as credenciais forem inválidas THEN o sistema SHALL responder `401`.
3. WHEN o usuário faz logout THEN o sistema SHALL invalidar a sessão.
4. IF a sessão estiver ausente ou expirada THEN o sistema SHALL responder `401` nas rotas protegidas.
5. The system SHALL armazenar a senha apenas como hash.
6. The system SHALL entregar a sessão em cookie httpOnly.

**Independent Test**: Logar, acessar uma rota protegida e depois sair e receber `401`.

---

### P1: Autorizar por perfil ⭐ MVP

**User Story**: Como responsável pelo sistema, quero que cada perfil só faça o permitido, para proteger as operações.

**Why P1**: RF014.

**Acceptance Criteria**:

1. WHEN um usuário acessa uma ação sem o perfil permitido THEN o sistema SHALL responder `403`.
2. The system SHALL aplicar a matriz de perfis no servidor, não só na interface.
3. The system SHALL permitir ao Vendedor apenas consulta.

**Independent Test**: Vendedor tentando registrar execução recebe `403`.

---

### P1: Gerenciar usuários ⭐ MVP

**User Story**: Como responsável pelo sistema, quero cadastrar usuários e associá-los a setores e perfis.

**Why P1**: RF013.

**Acceptance Criteria**:

1. WHEN o responsável cria um usuário THEN o sistema SHALL persistir o usuário com a senha hasheada.
2. IF o email já existir THEN o sistema SHALL rejeitar com conflito.
3. WHEN o responsável associa setores e perfis a um usuário THEN o sistema SHALL persistir a associação N:N.
4. WHEN o responsável inativa um usuário THEN o sistema SHALL impedir o login desse usuário.

**Independent Test**: Criar um usuário, associar a Telhas e logar.

---

### P2: Usar a sessão nas rotas existentes

**User Story**: Como responsável técnico, quero que as rotas usem a sessão, para não depender do cabeçalho temporário.

**Why P2**: Endurece as features anteriores.

**Acceptance Criteria**:

1. WHEN uma rota de produção, ocorrência ou entrega recebe a requisição THEN o sistema SHALL usar o usuário da sessão e ignorar o cabeçalho `x-user-id`.

**Independent Test**: Chamar a fila sem cookie recebe `401`; com cookie, retorna a fila do usuário.

---

## Edge Cases

- IF o usuário estiver inativo THEN o sistema SHALL recusar o login com `401`.
- IF o token de sessão for adulterado THEN o sistema SHALL rejeitar com `401`.
- IF o usuário não pertencer ao setor da ação THEN o sistema SHALL responder `403`.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUTH-01 | P1: Autenticar | Design | Done |
| AUTH-02 | P1: Autenticar | Design | Done |
| AUTH-03 | P1: Autenticar | Design | Done |
| AUTH-04 | P1: Autenticar | Design | Done |
| AUTH-05 | P1: Autenticar | Design | Done |
| AUTH-06 | P1: Autenticar | Design | Done |
| AUTH-07 | P1: Autorizar | Design | Done |
| AUTH-08 | P1: Autorizar | Design | Done |
| AUTH-09 | P1: Autorizar | Design | Done |
| AUTH-10 | P1: Usuários | Design | Done |
| AUTH-11 | P1: Usuários | Design | Done |
| AUTH-12 | P1: Usuários | Design | Done |
| AUTH-13 | P1: Usuários | Design | Done |
| AUTH-14 | P2: Sessão nas rotas | Design | Done |
| AUTH-15 | Edge: usuário inativo | Design | Done |
| AUTH-16 | Edge: token adulterado | Design | Done |

**Coverage:** 16 total, 0 mapped to tasks, 16 unmapped ⚠️

---

## Success Criteria

- [ ] Login com sessão em cookie httpOnly e senha apenas como hash.
- [ ] Rotas protegidas respondem `401` sem sessão e `403` sem perfil.
- [ ] Vendedor só consulta.
- [ ] As rotas de produção/ocorrência/entrega usam a sessão, não o cabeçalho temporário.
