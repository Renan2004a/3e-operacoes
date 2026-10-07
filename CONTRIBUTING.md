# Como contribuir — 3E Operações

Obrigado por ajudar! Este projeto segue o fluxo **spec-driven** e a **evidência antes de concluir**: nenhuma mudança é considerada pronta sem testes, typecheck/lint e verificação contra requisito/regra.

## Pré-requisitos

- Node.js ≥ 22.18, npm, Git.
- Opcional: Docker (MySQL local), VS Code (extensões recomendadas em `.vscode/extensions.json`).
- Leia antes de codar: [`AGENTS.md`](AGENTS.md), [`docs/governanca-agentes.md`](docs/governanca-agentes.md), [`.specs/STATE.md`](.specs/STATE.md) e os docs de domínio pertinentes.

## Fluxo de trabalho (Git)

1. **Atualize a `main`**: `git pull origin main`.
2. **Crie um branch** a partir de `main`:
   - `feat/<slug>` para funcionalidade
   - `fix/<slug>` para correção
   - `docs/<slug>` para documentação
3. **Faça commits pequenos** (Conventional Commits): `feat(producao): registra execucao`.
4. **Antes de abrir o PR**, rode:
   ```powershell
   npm run prisma:generate
   npm run lint
   npm run typecheck
   npm run typecheck:connector
   npm test
   npm run build
   ```
5. **Abra um Pull Request** para `main` (o template aparece automaticamente). A CI precisa passar e **1 revisão** é necessária.

> Professores/revisores: acesso de **leitura** ao repositório; revisam os PRs e a documentação.

## Regras importantes

- **Nunca commite credenciais.** `.env` e `.env.*` estão no `.gitignore`; use `.env.example` como modelo.
- Não escreva no Top Gerente — acesso **somente leitura** pelo conector.
- Mudanças de método seguem o **`tlc-spec-driven`**: spec → design → tasks → execute → verify.
- Testes derivam da especificação; **não** enfraqueça, apague ou pule testes para passar.
- Datas em UTC no banco; exibição em `America/Sao_Paulo`.

## Onde está cada coisa

- Requisitos/regras: `docs/requisitos.md`, `docs/regras-negocio.md`.
- Especificações por feature: `.specs/features/<feature>/`.
- Diário do que foi feito: `docs/execucao.md`.
- Relatório técnico: `docs/relatorio-tecnico.md`.
