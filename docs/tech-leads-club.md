# Tech Leads Club - skills adotadas

As skills do Tech Leads Club devem ser instaladas **localmente no projeto** e commitadas no Git. O bootstrap fixa a versão do instalador para evitar atualização silenciosa do conjunto de instruções.

## Instalador fixado

- Pacote: `@tech-leads-club/agent-skills@1.4.10`
- Agente-alvo: `opencode`
- Escopo: local do projeto

## Skills selecionadas

- `tlc-spec-driven` - fluxo principal de Specify → Design → Tasks → Execute/Verify.
- `coding-guidelines` - disciplina de mudanças pequenas e código simples.
- `harness-eval` - auditoria do AGENTS.md, skills e referências.
- `create-adr` - registro de decisões arquiteturais relevantes.
- `spec-driven-eval` - avaliação explícita de implementação contra especificação; usar quando solicitado.
- `frontend-blueprint` - transformar referências visuais e requisitos em blueprint de frontend.
- `react-best-practices` - práticas de React/Next.js.
- `react-composition-patterns` - composição de componentes.
- `web-design-guidelines` - auditoria da interface.
- `accessibility` - acessibilidade.
- `playwright-skill` - automação e E2E.
- `security-best-practices` - revisão de segurança geral.
- `skill-architect` - criação/revisão de skills futuras.

## Atualizações

Não atualizar automaticamente. Atualizar deliberadamente, revisar diff das skills e então commitar a nova versão/lockfile.

## Atribuição

As skills de terceiros preservam autoria e licença do Tech Leads Club e de seus autores. Não remover metadados/licenças instalados pelo CLI oficial.

## Bootstrap deste pacote

As skills 3E já estão versionadas em `.opencode/skills/`. As skills do Tech Leads Club devem ser baixadas pelo CLI oficial usando um dos scripts em `scripts/`, revisadas por diff e então versionadas no mesmo repositório. O projeto não depende de atualização automática dessas skills.
