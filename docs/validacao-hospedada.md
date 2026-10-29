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

---

## 8. Atualização 2026-10-26 — perfil Operador e ocorrências (AD-021)

Deploy do commit `4be4bc2` (feature + pool + documentação) e validação do fluxo do Operador e da visão do Gerente.

| Item | Local | Hospedado |
| --- | --- | --- |
| `/operador/fila` (“Meus pedidos”) | ✅ | ✅ |
| `/operador/ocorrencias` (registrar/consultar) | ✅ | ✅ |
| Atividade → ocorrência pré-selecionada | ✅ | ✅ |
| Painel do Gerente com “Ocorrências recentes” | ✅ | ✅ |
| Sem rolagem horizontal em 390 px (operador/gerente) | **9/9** | **9/9** |
| Regressão responsiva/impressão (5 telas + impressão) | **11/11** | **11/11** |
| `/api/health` / `/login` | — | **200 / 200** |
| Testes automatizados | **1023** verdes + 24 ignorados | mesmos artefatos do commit |
| Lint / typecheck / build | 0 erros / OK / OK | — |
| Pool do banco (RDS) | sem `pool timeout` | sem `pool timeout` observado |

- **Script**: `scripts/validar-operador.mjs` (não grava dados; apenas navega e verifica).
- **Evidências**: `docs/video/validacao-operador/` (operador e gerente em 390 px).
- **Banco**: 13 ocorrências persistidas, com vínculo ao pedido/item/setor/responsável/motivo.
- **Configuração nova (opcional)**: `DB_CONNECTION_LIMIT` (padrão 15) e `DB_ACQUIRE_TIMEOUT_MS` (padrão 30000). Se o Railway tiver limite menor de conexões, ajustar no serviço.
- **Ressalva**: o deploy usou o mesmo token de projeto de 2026-10-25; **rotacionar/revogar** após a entrega. O banco do app continua compartilhado com o ambiente de desenvolvimento (go-live real exige banco separado).

## 9. Validação local do PR #14 (2026-10-25)

Validação feita na branch `fix/vendedor-integracao-pos-merge`, sem alterar produção.

- **Banco**: MySQL 8.0.46 isolado em `/tmp/opencode/mysql-3e`, porta 3307. O app usou `3e_operacoes_test` (migrations + seed) e os testes de integração usaram `3e_operacoes_integration`, ambos criados do zero e descartáveis.
- **Aplicação**: `next dev` local em `http://localhost:3000`, com dados de 25 pedidos de teste.
- **Conector**: servidor HTTP local simulado em `127.0.0.1:4010`, com callback assinado para a aplicação. **Não é o conector Top Gerente real**; a simulação cobriu sucesso, espera de 120 s, falha `ORDER_NOT_FOUND` e callback manual.
- **Navegador**: Playwright/Chromium, 15/15 cenários aprovados — login, filtros/pesquisa/período, página 2, retorno do detalhe (Vendedor e Gerente), links diretos, retorno externo bloqueado, importação nova/reutilizada/falha, falha de consulta, pausa de 60 s e retomada manual, sem erro de página no console.
- **MySQL real**: 24/24 testes de integração (`consulta-pedidos` e `prazos`) aprovados em `RUN_INTEGRATION_TESTS=1`, incluindo paginação, filtros combinados e prazos.
- **API/banco**: job ativo antigo reutilizado sem despacho, com `REUSED_JOB`/`newDispatch: false`; job novo e retry de falha com `NEW_ATTEMPT`/`newDispatch: true`; eventos e pedidos persistidos.
- **Defeitos corrigidos durante a validação**: (1) link direto com `pagina=2` perdia a página na montagem em StrictMode; (2) a listagem lia `window` no primeiro render e gerava divergência de hidratação; (3) o retorno client-side do detalhe montava a listagem antes da query e perdia filtros. Correções nos commits `d26c0bb` e `3f161ab`.
- **Checks finais**: 1017 testes automatizados aprovados (24 de integração ignorados na suíte padrão), typecheck, typecheck do conector, lint sem erros e build OK.

**Ainda não validado:** conector Top Gerente real, dados reais, deploy/hospedagem e teste manual em dispositivo físico. As decisões pendentes AD-010, AD-011, AD-012, AD-013, AD-016 e AD-017 continuam fora do escopo.

---

## 10. Atualização 2026-10-27 — integração dos PRs #14 e #15

Deploy do commit `c3f1ff0` (merge dos PRs #15 e #14) e validação dos fluxos alterados em produção.

| Item | Local | Hospedado |
| --- | --- | --- |
| PR #15 — painel/detalhe do Gerente (`a25d8b6`) | ✅ | ✅ |
| PR #14 — filtros/importação do Vendedor (`854d0c3`) | ✅ | ✅ |
| Testes automatizados | **1037** verdes + 24 ignorados | mesmos artefatos do commit |
| Lint / typecheck / build | 0 erros / OK / OK | — |
| Playwright — novos fluxos (`validar-prs-14-15.mjs`) | **15/15** | **15/15** |
| Playwright — responsivo/impressão | **11/11** | **11/11** |
| Playwright — Operador | **9/9** | **9/9** |
| `/api/health` / `/login` | — | **200 / 200** |

- **PRs no GitHub**: #15 e #14 constam como **merged** (`a25d8b6` e `854d0c3`).
- **Validação hospedada**: filtros/retorno do Vendedor e do Gerente, painel com Atualizar, itens recolhíveis, rótulos de prazo e formulário de importação; sem erros de console/hidratação.
- **Base de dados**: 7 pedidos; cenário de página 2 não aplicável (N/A) nesta base. Testes de integração MySQL permanecem *gated*.
- **Ressalva**: o deploy reutilizou o token de projeto de 2026-10-25; **rotacionar/revogar** após a entrega. O banco do app continua compartilhado com o desenvolvimento.

**Evidências**: `docs/video/validacao-prs-14-15/` e `docs/video/validacao-prod/`.

---

## 11. Atualização 2026-10-27 — correções de UI (professor/Saul)

Deploy do commit `ce4fbd5` (correções de UI) com o ajuste final de recarga do histórico de prazos, e validação em produção.

| Item | Local | Hospedado |
| --- | --- | --- |
| Unidades com vírgula e percentuais com 1 casa decimal | ✅ | ✅ |
| Previsão de entrega na lista, detalhe, operador, expedição e impressão | ✅ | ✅ |
| Histórico de prazos (auditoria) | ✅ | ✅ |
| Remessa com número automático e Vendedor sem gestão de remessas | ✅ | ✅ |
| Explicação do mapeamento e lista de mapeamentos | ✅ | ✅ |
| Explicação da inativação de usuários | ✅ | ✅ |
| Testes automatizados | **1037** verdes + 24 ignorados | mesmos artefatos |
| Lint / typecheck / build | 0 erros (7 avisos) / OK / OK | — |
| Playwright — correções de UI (`validar-correcoes-ui.mjs`) | **15/15** | **15/15** |
| Playwright — responsivo/impressão | **11/11** | **11/11** |
| Playwright — Operador | **9/9** | **9/9** |
| `/api/health` / `/login` | — | **200 / 200** |

- **Vídeo**: `docs/video/demo-completa-2026-10-27.mp4` (8m43s, legendas queimadas), com capítulo de app, alteração/restauração de prazo e capítulo de banco (DBeaver + consultas reais).
- **Banco**: a demonstração criou linhas de `DEADLINE_CHANGED` no item 1 do pedido 82249 (06/12 → 13/12 e 13/12 → 06/12; gravações repetidas deixaram quatro linhas no total). O valor atual do item foi restaurado e nenhum outro dado operacional foi alterado na gravação. A remessa criada foi removida.
- **Vídeo**: `docs/video/demo-completa-2026-10-27.mp4` (8m43s) publicado em `main` no commit `fd1f2e4`; deploy validado no commit `365f143`.
- **Reestruturação do banco**: planejada em `docs/revisao-banco-professor.md`; não executada.
- **Ressalva**: token de projeto do Railway ainda ativo; rotacionar/revogar.

---

## 12. Revisão de prontidão (2026-10-28) — deploy `65d6dd8`

Revisão completa antes da apresentação ao cliente: segurança, domínio, UI e deploy.

| Item | Local | Hospedado |
| --- | --- | --- |
| Testes automatizados | **1049** verdes + 24 ignorados | mesmos artefatos |
| Lint / typecheck / build | 0 erros (7 avisos) / OK / OK | — |
| Playwright — correções de UI (`validar-correcoes-ui.mjs`) | **15/15** | **15/15** |
| Playwright — revisão de prontidão (`validar-melhorias.mjs`) | **15/15** | **15/15** |
| `/api/health` / `/login` | — | **200 / 200** |
| Cabeçalhos de segurança | — | `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, HSTS |
| `robots.txt` | — | `Disallow: /` (sistema interno) |
| Limite de tentativas de login | — | 6ª tentativa do mesmo e-mail retorna **429** |

- **Next.js** atualizado de `16.3.5` para `16.4.3` (correções de segurança do framework).
- **Sessão**: cookie `Secure` configurável (`COOKIE_SECURE`), `SESSION_SECRET` com 64 caracteres no Railway, usuário inativado perde a sessão na hora.
- **Dados**: textos do legado com dupla codificação corrigidos (`Dobradiça`, `Maurício`); descrições `.` e código `0` normalizados; mapeamento inválido `CORTE_DOBRA:` removido; job travado em `RUNNING` encerrado.
- **Importação**: dois pedidos novos importados pelo conector local (82271 e 82270), com encoding correto e sem duplicação.
- **Pendente para a demo**: o conector em produção ainda aponta para `http://localhost:8787`. Para importar ao vivo é preciso expor o conector (túnel) e ajustar `LOCAL_CONNECTOR_BASE_URL`, ou rodar a demo no ambiente local.

---

## 13. Integração da branch da Vanessa e importação ao vivo (2026-10-28)

- **Branch integrada**: `feat/gerente-ajustes` (4 commits, Vanessa), sem PR aberto.
  - Painel do Gerente simplificado, cartões com drill-down e abertura em nova aba.
  - Nova página `/gerente/atividades` (filtro por status) e API `GET /api/indicadores/atividades`.
  - Ocorrências mostram nome e perfil de quem registrou; `+N outros` expande a lista.
  - Fila do operador: status e prioridade mais claros (prioridade 0 não aparece).
- **Ajustes na integração**: a API de atividades passou a exigir `consultar_atividades_gerente` (Gerente, Responsável pelo Sistema e Técnico; Operador recebe **403**); a data do drill-down usa o fuso `America/Sao_Paulo` (evita um dia de diferença).
- **Gates após o merge**: **1062 testes** verdes + 24 ignorados; lint 0 erros; typecheck/build OK; `validar-correcoes-ui` **15/15** e `validar-melhorias` **15/15** em produção.
- **Importação ao vivo (temporária)**: conector local na porta 8787 exposto por túnel rápido do Cloudflare (`*.trycloudflare.com`), com `LOCAL_CONNECTOR_BASE_URL` apontando para o túnel no Railway. Pedidos **82270, 82271 e 82272** importados em produção; o 82272 confirmou o fluxo completo (job `SUCCEEDED`).

> O túnel rápido é temporário e **não tem SLA**: se o processo do `cloudflared` ou o conector reiniciar, a URL muda e é preciso atualizar `LOCAL_CONNECTOR_BASE_URL` no Railway e reiniciar o serviço. Para o go-live, usar um túnel nomeado com Cloudflare Access (ver `docs/go-live.md`).

### Atualização (2026-10-28) — ajustes finais da Vanessa

- Novos commits integrados: `b72cedc` (fecha a aba de atividades ao voltar, colunas de alerta alinhadas ao topo, texto de divergência sem prometer análise do gerente).
- Gates: **1063 testes** verdes + 24 ignorados; lint 0 erros; typecheck/build OK.
- Produção: `validar-correcoes-ui` **15/15**, `validar-melhorias` **15/15**, importação do pedido 82272 novamente `SUCCEEDED` pelo túnel, fallback “Voltar para o painel” validado.
- Ajuste no gate: a checagem de quantidades passou a aceitar pedido só com peças inteiras (o primeiro pedido agora é o 82272, 4 UN) e continua rejeitando ponto decimal.

---

## 14. Atualização 2026-10-29 — PRs da Vanusa, Vanessa e Marcelo

O `main` avançou de `2f0cbaf` para **`ed20d1c`**, integrando os PRs #18–#24 e #27–#31.

**O que entrou**
- **Vanessa (#27–#29, expedição)**: confirmação antes de registrar a entrega, mensagens de erro por causa, situação real do item (entregue/aguardando produção) e botão **“Entregar tudo”**.
- **Marcelo (#18–#24, #30)**: seleção efetiva do setor sugerido, classificação atômica e transacional (mapeamento + atividade), estado após conflito, atraso comercial pela quantidade entregue (AD-025), consulta vigente (V07), histórico de prazo transacional (V08) e orientação de remessas do Vendedor (V09).
- **Marcelo (#31)**: documentação do marco Vendedor V01–V09, separação de ambientes e avaliação heurística da Expedição.
- **Sem migração de banco nova**; as migrations existentes continuam válidas.

**Gates e produção**
| Item | Resultado |
| --- | --- |
| Testes | **1174** verdes + 47 ignorados (integração MySQL gated) |
| Lint / typecheck / build | 0 erros / OK / OK |
| Deploy Railway (`ed20d1c`) | concluído, `/api/health` 200 |
| `validar-correcoes-ui` | **15/15** |
| `validar-melhorias` | **15/15** |
| Expedição — “Entregar tudo” + confirmação | validado em produção (diálogo cancelado, sem gravação) |
| Importação | pedido 82272 `SUCCEEDED` pelo túnel |

- O primeiro despacho após a troca do túnel falhou porque o container antigo ainda estava servindo (`CONNECTOR_UNAVAILABLE`); um deploy completo resolveu e a importação seguinte concluiu.
- O túnel rápido mudou de URL; a variável `LOCAL_CONNECTOR_BASE_URL` foi atualizada no Railway. Para religar: `scripts/conector-demo.ps1`.
- **Conflito resolvido na integração**: mantivemos a data do drill-down no fuso `America/Sao_Paulo` (a branch usava `slice(0,10)`, que desloca o dia) e a prioridade 0 oculta na fila.
