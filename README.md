# 3E Operações

Sistema de acompanhamento de pedidos, produção, ocorrências e expedição da 3E Ferro e Aço. O sistema funciona como uma camada operacional sobre o Top Gerente; o legado continua sendo a fonte oficial dos dados comerciais e é acessado somente para leitura.

## Começo rápido

1. Instale Node.js compatível com Next.js 16 e npm.
2. Copie `.env.example` para `.env.local` e preencha apenas as variáveis do banco do aplicativo.
3. Execute `npm install` e versione o `package-lock.json` gerado.
4. Instale as skills do Tech Leads Club localmente com `scripts/install-tech-leads-club-skills.ps1` (Windows) ou `scripts/install-tech-leads-club-skills.sh` (Linux/macOS).
5. Revise o `git diff` e versione também as skills/lockfile instalados pelo Tech Leads Club.
6. Execute `npm run prisma:generate` e depois `npm run dev`.
7. Abra o projeto no OpenCode pela raiz do repositório para que `AGENTS.md`, `.opencode/skills/` e `.opencode/agents/` sejam descobertos.

## Estrutura

- `src/app/`: rotas e interface Next.js.
- `src/modules/`: monolito modular por domínio; regras de negócio não dependem de Next.js.
- `src/shared/`: infraestrutura e utilitários compartilhados.
- `connector-local/`: serviço executado na empresa para consultar o MySQL do Top Gerente via usuário somente leitura.
- `prisma/`: schema do banco próprio do aplicativo.
- `docs/`: documentação efetiva e fontes convertidas para Markdown.
- `.specs/`: memória e especificações do fluxo spec-driven.
- `.opencode/`: skills e subagentes do OpenCode.
- `design/inspiracoes/`: referências visuais; não são especificação funcional nem código obrigatório para reaproveitamento.

## Regra importante sobre o frontend

As referências visuais são **entrada de design**. Elas podem orientar linguagem visual, hierarquia e componentes, mas **não são especificação funcional e não obrigam reaproveitamento de código**.
