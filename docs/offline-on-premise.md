# Rodar offline (on-premise na rede da empresa)

Objetivo: o sistema funcionar **sem internet**, instalado na rede local da 3E. As máquinas da fábrica acessam o app por um **servidor local**; o conector lê o **Top Gerente** na própria rede. Nada depende da nuvem.

```text
Máquinas (navegador) --LAN--> Servidor local
                               |-- App Next.js (porta 3000)
                               |-- MySQL do app (banco próprio)
                               |-- Conector local --> MySQL Top Gerente (LAN, somente leitura)
```

> O servidor precisa estar **ligado na rede** (um PC/servidor da empresa). As máquinas clientes só precisam de navegador.

## Opção 1 — Node direto no servidor (mais simples)

### Requisitos do servidor
- Node.js ≥ 22.18 e npm.
- MySQL 8 (no próprio servidor ou já existente na rede).
- Git (ou uma cópia do projeto).

### Passos
```powershell
# 1. Código
git clone <repo> ; cd 3e-operacoes-starter

# 2. Dependências e build
npm ci
npm run prisma:generate
npm run build

# 3. Banco do app (variáveis de ambiente)
Copy-Item .env.example .env      # só se ainda não existir; ajuste o DATABASE_URL local
npm run prisma:deploy            # aplica as migrations
npm run prisma:seed              # setores, motivos e usuários

# 4. Subir o app (fica ouvindo na rede)
$env:PORT=3000
npm start                        # http://<IP-do-servidor>:3000
```

### Conector local (lê o Top Gerente na LAN)
```powershell
Copy-Item connector-local/.env.example connector-local/.env
# Aponte TOPGERENTE_HOST para o MySQL do Top Gerente na rede da empresa
# e RAILWAY_CALLBACK_URL para http://localhost:3000/api/integracao/callback
npm --workspace connector-local run start   # porta 8787
```

### Acesso das máquinas
- No navegador das máquinas: `http://<IP-do-servidor>:3000`.
- Libere a porta 3000 no firewall do servidor.
- Opcional: coloque um IP fixo/DNS interno (ex.: `http://operacoes.3e.local:3000`).

### Iniciar automaticamente com o servidor
- **Windows**: Agendador de Tarefas (ao iniciar) rodando `npm start` e o conector; ou `nssm` como serviço.
- **Linux**: `systemd` (um serviço para o app e outro para o conector).

## Opção 2 — Docker (servidor com Docker)

Há um `docker-compose.onpremise.yml` que sobe **MySQL + app + conector**:

```powershell
# Ajuste os .env (app e conector) e então:
docker compose -f docker-compose.onpremise.yml up -d --build
# App: http://<IP-do-servidor>:3000
```

Serviços:
- `mysql` — banco próprio do app.
- `app` — Next.js (aplica `prisma migrate deploy` na subida).
- `connector` — lê o Top Gerente e devolve por callback.

> O caminho Docker precisa ser validado no servidor (não testado aqui, pois o Docker não está disponível neste ambiente). O caminho Node (Opção 1) é o mais direto e previsível.

## Configuração de rede

| Variável | Onde | Valor on-premise |
| --- | --- | --- |
| `DATABASE_URL` | app (`.env`) | MySQL do app na rede/servidor |
| `LOCAL_CONNECTOR_BASE_URL` | app | `http://localhost:8787` (Node) ou `http://connector:8787` (Docker) |
| `LOCAL_CONNECTOR_TOKEN` | app | igual a `CONNECTOR_SHARED_TOKEN` do conector |
| `CONNECTOR_CALLBACK_TOKEN` | app + conector | igual nos dois |
| `TOPGERENTE_HOST` | conector | MySQL do Top Gerente na rede da empresa |
| `RAILWAY_CALLBACK_URL` | conector | `http://<app>/api/integracao/callback` |

## Sem internet — o que continua funcionando
- Login, fila, execução, ocorrências, entregas, prazos, indicadores e consulta.
- Importação de pedidos (o Top Gerente está na LAN).
- Não depende de Railway nem da AWS.

## O que não é coberto por esta opção
- Operar **sem o servidor** (cada tablet sozinho) exigiria um **PWA offline-first** (sincronização local) — opção B, fora deste pacote.
- Gráficos/relatórios avançados e notificações externas.

## Segurança
- Credenciais apenas nos `.env` (fora do Git).
- Conector lê o Top Gerente **somente leitura** (ideal: usuário `SELECT` dedicado).
- Restrinja o acesso à porta 3000 à rede interna.
