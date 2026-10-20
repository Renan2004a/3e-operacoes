# Validação no ambiente hospedado

**Data**: 2026-10-20
**URL**: https://3e-operacoes-production.up.railway.app
**Commit implantado**: `8861b96` (código) — o commit do vídeo é posterior e não altera o app.
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
| Resumo | **9/9 verificações OK** |

Evidências: `docs/video/validacao-prod/` (PNGs e `ordem-producao.pdf`).

### Comparação local × hospedado

| Item | Local | Hospedado |
| --- | --- | --- |
| Rotas novas (`/vendedor/pedidos/[orderId]`) | OK | OK |
| Responsividade 390 px | 5/5 | 5/5 |
| Tabela em cartões | OK | OK |
| Impressão em 1 página | OK | OK |
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

## 5. Próximos passos para go-live

- Provisionar MySQL de produção dedicado e rodar `prisma migrate deploy` (não `reset`).
- Configurar Cloudflare Tunnel/Access do conector e o usuário `SELECT` no Top Gerente real.
- Trocar `TOPGERENTE_*` no conector (mesma porta/adapter) e importar um pedido conhecido para comparar.
- Revisar usuários/senhas de seed e remover dados de demonstração.
- Rotacionar segredos que circularam.
