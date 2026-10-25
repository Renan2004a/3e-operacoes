# Validação no ambiente hospedado

**Data**: 2026-10-20
**URL**: https://3e-operacoes-production.up.railway.app
**Commit implantado**: `6e21336` (código + schema com tabelas em português) — o commit do vídeo é posterior e não altera o app.
**Método**: deploy por CLI (`railway up`) e o **mesmo script Playwright** usado no ambiente local.

> A validação hospedada só foi executada **depois** de todos os gates locais passarem (700 testes, build e 9/9 verificações locais). Nenhuma migration destrutiva ou teste que alterasse dados reais foi executado.

---

## 1. Procedimento executado

1. Build local validado (`npm run lint`, `typecheck`, `test`, `build`).
2. Deploy: `railway up -p <PROJECT_ID> -s 3e-operacoes -e <ENV_ID> -c` (o auto-deploy via GitHub está desligado).
3. Sem `prisma migrate reset` e sem seed no ambiente: as migrations já estavam aplicadas.
4. Smoke test e validação Playwright contra a URL pública.

---

## 2. Resultados

| Verificação | Resultado |
| --- | --- |
| `/api/health` | **200** |
| `/login` | **200** |
| Login por perfil (vendedor/gerente/operador/admin) | **OK** |
| Sem rolagem horizontal em 390 px (5 telas) | **5/5 OK** (`scrollWidth === innerWidth`) |
| Tabela de usuários em cartões no celular | **OK** (`table: block`, `thead: none`) |
| “Voltar para os pedidos” no vendedor | **OK** (`href=/vendedor/pedidos`) |
| Impressão: shell sem `min-height` | **OK** (`0px`) |
| Impressão: PDF da ordem | **1 página** |
| Tabelas físicas em português (`usuarios`, `pedidos`, …) | **17/17** (migration aplicada; sem drift) |
| Resumo | **9/9 verificações OK** |

Evidências: `docs/video/validacao-prod/` (PNGs e `ordem-producao.pdf`).

### Comparação local × hospedado

| Item | Local | Hospedado |
| --- | --- | --- |
| Rotas novas (`/vendedor/pedidos/[orderId]`) | OK | OK |
| Responsividade 390 px | 5/5 | 5/5 |
| Tabela em cartões | OK | OK |
| Impressão em 1 página | OK | OK |
| Tabelas em português | OK | OK |
| Testes automatizados | 700 verdes | mesmos artefatos do commit |

Não houve diferença de comportamento observada entre local e hospedado.

---

## 3. Configuração usada (sem credenciais)

- Serviço Railway `3e-operacoes`, ambiente `production`, porta `8080` (`PORT`).
- `DATABASE_URL` → MySQL do app (`3e_operacoes`).
- `SESSION_SECRET`, `CONNECTOR_CALLBACK_TOKEN`, `LOCAL_CONNECTOR_TOKEN`, `APP_INTERNAL_TOKEN` definidos no cofre do Railway.
- Conector local permanece na rede da empresa; o app só o acessa por HTTPS (Cloudflare Tunnel/Access).

---

## 4. Ressalvas e riscos (registrados honestamente)

1. **O ambiente “hospedado” compartilha o banco de desenvolvimento (AWS `3e_operacoes`).** Para um go-live real, provisione um MySQL **separado** de produção e rode `prisma migrate deploy` nele. Não use o banco de produção como banco de testes.
2. **Auto-deploy via GitHub desligado**: todo deploy é manual (`railway up`). O merge no GitHub não publica sozinho.
3. **Conector real**: a importação de pedidos novos depende do conector na rede da 3E. A validação hospedada usou pedidos já importados; a importação nova foi validada localmente com o conector.
4. **Token do Railway** usado nos deploys deve ser revogado/rotacionado após a entrega.
5. **Dados de demonstração**: o ambiente contém usuários de teste e pedidos reais de amostra; para produção, revisar cadastros e senhas.

---

## 5. Atualizações dos PRs #2, #3 e #4 (2026-10-22/23)

| Item | Local | Hospedado |
| --- | --- | --- |
| PR #2 — correção de setor (`AD-006`/`AD-007`) | ✅ | ✅ |
| PR #3 — totais por unidade (`AD-008`) | ✅ | ✅ |
| PR #4 — consulta, filtros, paginação e prazos | ✅ | ✅ |
| Testes | **866** verdes + 23 de integração ignorados (gated) | — |
| Lint / typecheck / build | 0 erros / OK / OK | — |
| Playwright (390 px, navegação, setor, totais, impressão) | **11/11** | **11/11** |
| Impressão | 1 página | 1 página |

**Deploy concluído em 2026-10-23:** o bloqueio “Deploys have been paused temporarily” foi resolvido no projeto e o `railway up` publicou o commit `f64cc9a`. A validação Playwright em produção passou **11/11** e `/api/health` responde `200`.

> Os testes de integração (`*.integration.test.ts`) só rodam com `RUN_INTEGRATION_TESTS=1` e um banco com `test`/`integration` no nome. No ambiente atual ficam **ignorados de propósito**, sem tocar o banco do app.

## 6. Próximos passos para go-live

- Provisionar MySQL de produção dedicado e rodar `prisma migrate deploy` (não `reset`).
- Configurar Cloudflare Tunnel/Access do conector e o usuário `SELECT` no Top Gerente real.
- Trocar `TOPGERENTE_*` no conector (mesma porta/adapter) e importar um pedido conhecido para comparar.
- Revisar usuários/senhas de seed e remover dados de demonstração.
- Rotacionar segredos que circularam.

---

## 7. Atualização 2026-10-25 — PRs #5 a #13 (9 PRs do Vendedor)

Os 9 PRs abertos do Marcelo foram revisados, integrados com resolução de conflitos e publicados.

| Item | Local | Hospedado |
| --- | --- | --- |
| PRs #5–#13 (importação, filtros, prazos, quantidades, remessas) | ✅ integrados | ✅ |
| Testes | **1005** verdes + 24 de integração ignorados | — |
| Lint / typecheck / build | 0 erros / OK / OK | — |
| Playwright (390 px, navegação, setor, totais, impressão) | **11/11** | **11/11** |
| `/api/health` / `/login` | — | **200 / 200** |

- **Commit no `main`**: `ccd8f8d` (branch de integração `integracao-prs`).
- **Conflitos resolvidos**: importação (#5/#8/#11/#13), lista/detalhe (#6/#7/#9/#10/#12) e `STATE.md` (ADs).
- **Decisão de conflito**: a UI de importação do **#8** (transparência/reimportação) foi mantida como vigente; o #13 (espera prolongada) foi reaplicado sobre ela na revisão pós-merge (`fix/vendedor-integracao-pos-merge`). A política do #8 de **não duplicar** job ativo antigo foi preservada, com o teste do #5 ajustado.
- **Auditoria (#11)** combinada com a leitura do job mais recente/retry (#8): `criarComAuditoria` + `registrarAuditoriaSolicitacao` convivem com `findLatestByOrderNumberSince`. Na revisão pós-merge, job ativo antigo passou a ser auditado como `REUSED_JOB` (`newDispatch: false`), coerente com a ausência de novo despacho.

> Os PRs foram integrados por merge local (a `main` contém todas as mudanças); os PRs no GitHub foram fechados com a referência do commit, já que os branches conflitavam entre si.
