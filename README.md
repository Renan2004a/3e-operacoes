# 3E Operações

Sistema de acompanhamento de pedidos, produção, ocorrências e expedição da **3E Ferro e Aço**. Funciona como uma **camada operacional sobre o Top Gerente** (legado, somente leitura): o legado continua sendo a fonte oficial dos dados comerciais.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Prisma 7** + **MySQL** (banco próprio do app)
- **Zod** (contratos/validação), **Tailwind CSS** + **shadcn/ui** (interface)
- **Vitest** + **Testing Library** (unitários) e **Playwright** (E2E)
- **Conector local** (`connector-local/`) para ler o Top Gerente e devolver por callback

## Como rodar

Guia completo em [`docs/operacao.md`](docs/operacao.md). Resumo:

```powershell
npm install
npm run prisma:generate
Copy-Item .env.example .env      # ajuste o DATABASE_URL
npm run db:up                    # MySQL local (Docker) — opcional
npm run prisma:migrate           # ou prisma:deploy
npm run prisma:seed              # setores, motivos e usuários de demonstração
npm run dev                      # http://localhost:3000
```

Logins de demonstração (seed): `admin@3e.local`, `operador@3e.local`, `gerente@3e.local`, `vendedor@3e.local`, `expedicao@3e.local` (senhas terminam em `123`; trocar em produção).

## Estrutura

- `src/app/`: rotas e interface (Next.js).
- `src/modules/`: domínio por área (auth, usuarios, setores, pedidos, integracao, producao, ocorrencias, expedicao, prazos, indicadores).
- `src/shared/`: infraestrutura compartilhada (banco, HTTP, UI).
- `connector-local/`: serviço local que lê o MySQL do Top Gerente (somente leitura).
- `prisma/`: schema, migrations e seed.
- `.specs/`: memória e especificações do fluxo spec-driven.
- `docs/`: documentação (requisitos, regras, arquitetura, integração, relatório técnico).
- `design/inspiracoes/`: referências visuais (inspiração, não especificação).

## Documentação

- **Relatório técnico**: [`docs/relatorio-tecnico.md`](docs/relatorio-tecnico.md)
- Requisitos: [`docs/requisitos.md`](docs/requisitos.md) · Regras de negócio: [`docs/regras-negocio.md`](docs/regras-negocio.md)
- Arquitetura: [`docs/arquitetura.md`](docs/arquitetura.md) · Integração: [`docs/integracao-top-gerente.md`](docs/integracao-top-gerente.md)
- Perfis e permissões: [`docs/perfis-permissoes.md`](docs/perfis-permissoes.md) · Frontend: [`docs/frontend.md`](docs/frontend.md) · Testes: [`docs/testes.md`](docs/testes.md)
- Diário de execução: [`docs/execucao.md`](docs/execucao.md) · Backlog: [`docs/backlog.md`](docs/backlog.md) · Go-live: [`docs/go-live.md`](docs/go-live.md)

## Testes

```powershell
npm test             # unitários (Vitest)
npm run test:coverage
npm run test:e2e     # Playwright (login + responsividade)
```

## Como contribuir

Veja [`CONTRIBUTING.md`](CONTRIBUTING.md). Regra de ouro: **nunca** commitar credenciais (`.env` está no `.gitignore`).

## Estado

- 11 features entregues e verificadas (spec-driven).
- 568 testes unitários + 14 E2E verdes.
- Banco do app: schema `3e_operacoes`; Top Gerente: `topgerente` (somente leitura, via conector).
