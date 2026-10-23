# Diagnóstico e plano — feedback dos docentes

**Data**: 2026-10-20
**Base**: inspeção do repositório, execução local (`npm run dev` + banco configurado) e validação com Playwright.
**Escopo**: correções de interface, navegação, feedback, fluxo de pedidos/remessas, impressão, banco e documentação.

---

## 1. O que foi inspecionado

| Camada | Evidência |
| --- | --- |
| Front-end | `src/app/(app)/**` (12 páginas), `src/shared/ui/**` (22 componentes), `src/app/globals.css` |
| Back-end | `src/app/api/**` (34 rotas), `src/modules/**` (10 módulos), `src/shared/http/**` |
| Banco | `prisma/schema.prisma` (17 modelos, 7 enums), 2 migrations, `prisma/seed.ts` |
| Integração | `connector-local/`, `src/app/api/integracao/**`, `docs/integracao-top-gerente.md` |
| Execução | `docker-compose.yml`, `.env.example`, `railway.json`, `Dockerfile`, `vercel.json` |
| Testes | 97 arquivos Vitest (700 testes), 4 specs Playwright |

---

## 2. Problemas relatados × causa × correção

| # | Problema do docente | Evidência / causa raiz | Correção aplicada | Status |
| --- | --- | --- | --- | --- |
| 2.1 | Interface não responsiva; precisa girar o aparelho | Shell já colapsa em `<768px`, mas tabelas de **pedidos** e **usuários** tinham 4 colunas com `whitespace-nowrap` e só rolagem interna; a tela de usuários juntava formulário + tabela numa página longa | Tabela vira **cartões no celular** via `.tabela-responsiva` (`data-label`), sem rolagem horizontal da página; shell com `overflow-x-hidden` e `min-w-0`; validação em 390×844 com `scrollWidth === innerWidth` | ✅ |
| 2.1 | Tela de usuários com problema no perfil admin | Tabela larga + formulário longo na mesma página | Layout em cartões no celular; ativação/inativação com confirmação inline; feedback no topo; área de toque ≥ 44px | ✅ |
| 2.1 | Muitas informações numa página | Detalhe do vendedor era renderizado **na mesma página** da lista, acumulando tudo | Detalhe em **rota própria** (`/vendedor/pedidos/[orderId]`); páginas separadas lista ↔ detalhe | ✅ |
| 2.2 | "Voltar para pedidos" não faz nada (vendedor) | `PedidoDetalhe` era inline na página da lista; o link apontava para `/vendedor/pedidos` (a própria tela) | Rota de detalhe + `basePath` correto; validação Playwright confirma `href=/vendedor/pedidos` | ✅ |
| 2.2 | Abrir pedido não leva ao detalhe | `onSelecionar` apenas setava estado local | `router.push('/vendedor/pedidos/${id}')`; rota nova testada | ✅ |
| 2.2 | Preservar filtros ao voltar | Filtros viviam só em estado React | Filtros sincronizados na URL (`history.replaceState`); a lista relê a URL ao montar | ✅ |
| 2.3 | Ações sem retorno | Desmembrar e remessas não exibiam sucesso; inativar usuário não existia | Mensagens de sucesso/erro com `aria-live`; confirmação antes de inativar; mensagens específicas por status HTTP | ✅ |
| 2.4 | Ordem das informações | Quantidades → prazo → desmembramento → remessa; o prazo vinha depois das ações | Reordenado: identificação → progresso → quantidades → **prazo** → desmembramento → **remessas** → ações | ✅ |
| 2.4 | Botão "+" para nova remessa | Formulário sempre aberto, sem hierarquia | Botão **"+ Adicionar remessa"** que abre/fecha o formulário (`aria-expanded`) | ✅ |
| 2.4 | Indicação de conclusão do desmembramento | Só um badge discreto | `Alert` "Item desmembrado" + badge "Desmembrado" + mensagem "Item desmembrado com sucesso." | ✅ |
| 2.5 | Barra de progresso com cores inconsistentes | `<progress>` nativo (cor do navegador) no painel e na execução; sem rótulo textual | Componente único `Progress` com `role="progressbar"`, percentual textual e cor por **estado real** (andamento/concluído/atenção/falha) | ✅ |
| 2.6 | Impressão gera página extra em branco | `min-h-screen` do shell + `main` com padding na mídia de impressão | `@media print` zera `min-height`/padding do shell, remove borda/sombra e evita quebra no meio; PDF validado com **1 página** | ✅ |
| 2.7 | Banco e nomenclatura | Não havia documento consolidado de banco local/hospedado nem instruções de DBeaver | `docs/banco-de-dados.md` + MER/DER atualizados; **tabelas físicas em português** (`@@map`), modelos Prisma em inglês (código) e UI/docs em português; migration `RENAME TABLE` sem perda de dados | ✅ |
| 2.8 | Integração | Nenhuma falha funcional encontrada; fluxo idempotente e somente leitura | Revisado; sem alteração de contrato. Limitação: teste real depende do conector local | ✅ (ver limitações) |

---

## 3. Plano de execução (fases)

| Fase | Entrega | Critério de aceitação | Status |
| --- | --- | --- | --- |
| 1 | Diagnóstico e plano | Este documento, com problema → causa → arquivo | ✅ |
| 2 | Navegação e páginas | Abrir pedido navega; voltar retorna à lista; filtros preservados | ✅ |
| 3 | Responsividade | 390×844 sem rolagem horizontal nas telas-chave; tabelas em cartões | ✅ |
| 4 | Feedback | Toda ação sensível tem carregando, sucesso, erro e prevenção de duplo envio | ✅ |
| 5 | Pedido/remessas | Ordem nova, "+" remessa, confirmação de desmembramento, progresso acessível | ✅ |
| 6 | Impressão | PDF com 1 página, sem corte de informação | ✅ |
| 7 | Banco/documentação | Documento de banco + DBeaver + MER/DER consistentes | ✅ |
| 8 | Testes locais | lint, typecheck, 700 testes, build e 9/9 verificações Playwright | ✅ |
| 9 | Heurísticas de Nielsen | 10 heurísticas com evidência e gravidade | ✅ |
| 10 | Mockups editáveis | HTML/CSS editável com telas e estados | ✅ |
| 11 | Validação hospedada | Deploy e smoke test em produção | ✅ (ver `validacao-hospedada.md`) |

---

## 4. Fora de escopo / limitações registradas

- **Paginação** de pedidos: implementada na correção A1 (paginação no servidor, 20 por página, navegação na interface e total). O histórico acima descreve o diagnóstico anterior a essa correção.
- **Edição completa de usuário** (nome/perfis/setores) pela UI: a API suporta `PATCH`, mas a tela implementa criação e ativação/inativação. Edição de perfil/setores fica no backlog.
- **E2E autenticado no CI** continua limitado à superfície pública; a validação autenticada foi feita localmente com Playwright contra o banco real.
- **Integração real** depende do conector local na rede da 3E; os testes locais usaram o conector/banco configurado e pedidos reais já importados.

---

## 5. Arquivos alterados (resumo)

- `src/shared/ui/progress.tsx` (novo), `src/shared/ui/pedidos-lista.tsx`, `src/shared/ui/pedido-detalhe.tsx`, `src/shared/ui/app-shell.tsx`
- `src/app/globals.css` (tabela responsiva + impressão)
- `src/app/(app)/vendedor/pedidos/page.tsx` e `[orderId]/page.tsx` (novo)
- `src/app/(app)/admin/usuarios/page.tsx`
- `src/app/(app)/gerente/painel/page.tsx`, `src/app/(app)/operador/atividades/[id]/page.tsx`, `src/app/(app)/producao/atividades/[id]/ordem/page.tsx`
- Testes atualizados/novos (detalhe do vendedor, usuários, progresso, URL).
