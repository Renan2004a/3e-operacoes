# Deploy (Railway / Vercel)

O app é Next.js + MySQL. O **conector local** (que lê o Top Gerente) **não vai para a nuvem**: ele fica na rede da empresa atrás do **Cloudflare Tunnel/Access**, e o app na nuvem chama esse endereço. Para o Top Gerente real, essa é a topologia correta.

> Não commite credenciais. Configure tudo por variáveis de ambiente na plataforma.

## Variáveis de ambiente (app)

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | MySQL do app (na nuvem). Ex.: plugin MySQL do Railway. |
| `SESSION_SECRET` | Segredo do cookie de sessão (valor forte). |
| `APP_INTERNAL_TOKEN` | Token interno das rotas de integração. |
| `LOCAL_CONNECTOR_BASE_URL` | URL pública do conector (Cloudflare Tunnel). |
| `LOCAL_CONNECTOR_TOKEN` | Token app → conector. |
| `CONNECTOR_CALLBACK_TOKEN` | Token conector → app (igual ao do conector). |
| `CONNECTOR_TIMEOUT_MS` | Timeout do despacho (ex.: 20000). |
| `APP_TIMEZONE` | `America/Sao_Paulo`. |

## Opção A — Railway (recomendada)

O Railway roda processo Node de longa duração e tem MySQL gerenciado — combina com o app + jobs em background (`after()`).

1. **Crie o projeto** no Railway e conecte o repositório GitHub (`main`).
2. **Adicione um MySQL** (plugin) e copie a `DATABASE_URL` para as variáveis do serviço do app.
3. **Defina as variáveis** da tabela acima. Em `LOCAL_CONNECTOR_BASE_URL`, use a URL do túnel do conector.
4. **Build/Start**: já configurados no **`railway.json`** (o Railway o usa automaticamente): build `npm ci && npx prisma generate && npm run build`; start `npx prisma migrate deploy && npm start`; healthcheck em `/api/health`.
5. **Migrations e seed** (uma vez): no shell do serviço, rode `npx prisma migrate deploy` e `npx prisma seed` (ou `npm run prisma:seed`).
6. O **conector** continua na empresa (ver `docs/offline-on-premise.md`), exposto por Cloudflare Tunnel; ajuste `RAILWAY_CALLBACK_URL` do conector para a URL pública do app.

## Opção B — Vercel

A Vercel hospeda o Next.js muito bem, mas é **serverless** e **não** hospeda MySQL nem o conector.

1. Importe o repositório na Vercel (framework Next.js). O **`vercel.json`** já define o build (`prisma generate && next build`).
2. Use um **MySQL externo** (Railway, PlanetScale, etc.) e configure `DATABASE_URL` + as demais variáveis nas *Environment Variables*.
3. Rode `prisma migrate deploy` e o seed **fora** da Vercel (do seu computador, apontando para o MySQL da nuvem) — a Vercel não roda migrations no build.
4. O conector fica na empresa (Cloudflare Tunnel) e o callback aponta para `https://<app>.vercel.app/api/integracao/callback`.
5. Atenção: funções serverless têm tempo limite; o despacho assíncrono (`after()`) funciona, mas o **callback** precisa chegar rápido. Se o RDS/legado for lento, prefira o Railway.

## Migrations e seed (comando único)

```bash
DATABASE_URL="<url-da-nuvem>" npx prisma migrate deploy
DATABASE_URL="<url-da-nuvem>" npm run prisma:seed
```

## Deploy via CLI (alternativa quando o auto-deploy do GitHub falha)

Se a conexão do Railway com o GitHub oscilar, dá para enviar o código **direto**
pela CLI (ignora o GitHub):

```bash
npm i -g @railway/cli
railway up -p <PROJECT_ID> -s <SERVICE> -e <ENVIRONMENT_ID> -c   # -c transmite só os logs de build
```

- Variáveis: `railway variables -s <SERVICE> -p <PROJECT_ID> -e <ENVIRONMENT_ID> --set "CHAVE=valor" --skip-deploys`
- Domínio: `railway domain -s <SERVICE> --project <PROJECT_ID> -e <ENVIRONMENT_ID> --port <PORTA>`
- Logs: `railway logs -s <SERVICE> -p <PROJECT_ID> -e <ENVIRONMENT_ID> --lines 60`

> **Porta:** no Railway o app escuta na porta da variável `PORT` (ex.: `8080`). O
> **domínio** deve apontar para **essa mesma porta**.

### Deploy de exemplo (feito)

- URL: `https://3e-operacoes-production.up.railway.app`
- Banco: MySQL `3e_operacoes` (RDS AWS já migrado/populado) via `DATABASE_URL`.

## Checklist pós-deploy

- [ ] Abrir `/login` e entrar com um usuário do seed.
- [ ] `/api/health` responde `200` (`{"status":"ok"}`).
- [ ] Importar um pedido de teste (com o conector na empresa e o túnel ativo).
- [ ] Conferir `SESSION_SECRET` forte e `CONNECTOR_CALLBACK_TOKEN` igual nos dois lados.
- [ ] Trocar as senhas do seed e cadastrar usuários reais.

## Segurança

- Conector com **usuário somente leitura** no Top Gerente.
- Cloudflare Access/mTLS entre o app e o conector.
- Nunca expor a porta do MySQL legado.
- Rotacionar credenciais que já circularam.

## Solução de problemas

- **`prisma generate` falha no `npm ci` — "Could not find Prisma Schema":** o
  client **não** deve ser gerado no `postinstall` (roda antes de o código ser
  copiado). Aqui o `npm run build` já executa `prisma generate` **depois** da
  cópia. Confirme que o deploy está no commit com
  `"build": "prisma generate && next build"`.
- **O start falha em `prisma migrate deploy`:** falta `DATABASE_URL`. Adicione o
  **MySQL** e a variável `DATABASE_URL = ${{MySQL.MYSQL_URL}}`.
- **O build falha no PostCSS/Tailwind (`@tailwindcss/postcss`)**: a plataforma
  pode instalar apenas dependências de produção. Como Tailwind/PostCSS são
  *devDependencies*, o build força `npm ci --include=dev` (já configurado no
  `railway.json` e no `Dockerfile`).
- **O `npm ci` reclama do workspace `connector-local`:** o app não precisa do
  conector para buildar; se ocorrer, me avise para isolar o install.

