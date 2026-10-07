# Governança de agentes

## Hierarquia

1. Pedido explícito do usuário nesta sessão.
2. Skill ativa do Tech Leads Club, para método de trabalho, planejamento, verificação e execução.
3. Documentos efetivos do projeto em `docs/` para fatos, requisitos e regras de domínio.
4. Skills locais 3E para procedimentos específicos do projeto.
5. Código existente e convenções do repositório.

Uma skill genérica não pode inventar fatos de negócio nem substituir requisitos documentados. Quando houver conflito de **método** entre uma skill do Tech Leads Club e uma skill local, prevalece a do Tech Leads Club.

## Antes de alterar código

- Ler `AGENTS.md`.
- Ler `.specs/STATE.md`.
- Carregar a skill Tech Leads Club mais específica para a tarefa quando instalada.
- Carregar as skills locais 3E pertinentes.
- Ler apenas os documentos de `docs/` necessários para a mudança.
- Para tarefa não trivial, preferir fluxo spec-driven e delegar exploração/revisão a subagentes quando disponível.

## Evidência antes de concluir

Nenhuma tarefa é considerada concluída sem testes pertinentes, typecheck/lint aplicável e verificação contra requisito/regra de negócio. Alterações remotas, deploy, push e mudanças destrutivas exigem autorização explícita.
