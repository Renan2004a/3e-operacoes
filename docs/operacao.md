# Operação local — como rodar no VS Code

Guia para subir o projeto na sua máquina e no VS Code.

## Pré-requisitos

- **Node.js ≥ 22.18** (o projeto usa Next.js 16).
- **VS Code**.
- **Docker Desktop** (opcional, para o MySQL local) — ou um MySQL próprio.
- Git.

## 1. Abrir no VS Code

Abra a **pasta do projeto** (`Arquivo → Abrir Pasta…`). O VS Code vai sugerir as extensões recomendadas (`.vscode/extensions.json`): ESLint, Prettier, Prisma, Tailwind, Playwright e Vitest. Aceite instalar.

## 2. Instalar dependências

No terminal integrado do VS Code (`Ctrl+'`):

```powershell
npm install
npm run prisma:generate
```

## 3. Configurar o ambiente

> ⚠️ **Só faça isto em um clone novo.** O `Copy-Item` **sobrescreve** o `.env`. Se o `.env` já existir e estiver configurado (ex.: apontando para a AWS), **não copie por cima**.

Copie `.env.example` para `.env` e ajuste se necessário:

```powershell
Copy-Item .env.example .env
```

O `.env` padrão aponta para um MySQL local:

```text
DATABASE_URL="mysql://app:app@127.0.0.1:3306/3e_operacoes"
```

> `.env` está no `.gitignore` — não versione credenciais.

## 4. Subir o banco (opcional, com Docker)

```powershell
npm run db:up        # sobe um MySQL 8 local
```

Depois aplique a migration inicial e rode o seed:

```powershell
npm run prisma:migrate   # cria as tabelas (dev)
npm run prisma:seed      # setores, motivos sugeridos e usuário admin
```

Se preferir um MySQL externo (Railway), só ajuste o `DATABASE_URL` e rode `npm run prisma:deploy` + `npm run prisma:seed`.

## 5. Rodar a aplicação

```powershell
npm run dev
```

Abra `http://localhost:3000` (ou `http://localhost:3000/login`). A tela de login funciona mesmo sem banco; os dados (fila, pedidos, indicadores) precisam do MySQL.

**Login do seed:** `admin@3e.local` / `admin123` (troque em produção).

## 6. Depurar no VS Code

- Aba **Executar e Depurar** (`Ctrl+Shift+D`) → escolha **Next.js: dev (debug)**.
- Ou rode as tarefas prontas em **Terminal → Executar Tarefa…**: `dev`, `test`, `test:e2e`, `db:up`, `prisma:migrate`, `prisma:seed`.

## 7. Testes

```powershell
npm test            # Vitest (unitários)
npm run test:e2e    # Playwright (login + responsividade)
```

Se o Playwright reclamar do navegador: `npx playwright install chromium`.

## 8. Comandos úteis

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Sobe o app (Next.js) |
| `npm run build` | Build de produção |
| `npm run lint` / `npm run typecheck` | Qualidade |
| `npm run prisma:generate` | Gera o Prisma Client |
| `npm run prisma:migrate` / `prisma:deploy` | Aplica migrations |
| `npm run prisma:seed` | Popula setores/motivos/admin |
| `npm run db:up` / `db:down` | MySQL local (Docker) |
| `npm run test` / `test:coverage` / `test:e2e` | Testes |

## 9. Extensões de arquivo (o que é cada código)

| Extensão | O que é |
| --- | --- |
| `.ts` | TypeScript — domínio, casos de uso, rotas de API, infraestrutura |
| `.tsx` | React/TypeScript — páginas e componentes de interface |
| `.prisma` | Schema do banco (`prisma/schema.prisma`) |
| `.test.ts` / `.test.tsx` | Testes de unidade (Vitest) |
| `.spec.ts` | Testes de navegador (Playwright E2E) |
| `.css` | Estilos (Tailwind) |
| `.mjs` / `.json` | Configurações (ESLint, Prettier, Next, etc.) |
| `.md` | Documentação |

## Problemas comuns

- **`node`/`npm` não reconhecidos**: adicione `C:\Program Files\nodejs` ao PATH, ou use o terminal que já tenha o Node.
- **`DATABASE_URL não configurada`**: falta o `.env` ou a variável. Rode `prisma generate` depois de configurar.
- **Migration falha**: confirme que o MySQL está de pé (`npm run db:up`) e o `DATABASE_URL` bate com o container.
