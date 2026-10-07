# Go-live da integração com o Top Gerente

Este documento descreve como colocar o aplicativo em produção no Railway falando
com o **Top Gerente real** por meio do conector local, sem expor o MySQL legado.
Nenhum valor de credencial aparece aqui: use o cofre de segredos do ambiente.

## Objetivo

- Publicar o app no Railway com o banco próprio e as migrations aplicadas.
- Executar o conector local na rede da 3E e publicá-lo por Cloudflare Tunnel/Access.
- Trocar a fonte de desenvolvimento (instância AWS) pela conexão real do Top Gerente
  sem alterar regra de negócio.

## Pré-requisitos

- Aplicativo publicado no Railway com MySQL próprio e migrations aplicadas.
- Computador/servidor sempre ligado na rede da 3E, com Node.js 22 ou superior.
- Domínio da 3E gerenciado no Cloudflare e um túnel nomeado disponível.
- Usuário MySQL **somente `SELECT`** no Top Gerente real, restrito às tabelas
  mapeadas em `docs/legado/schema-top-gerente.md`.

## 1. Conector local no cliente

O conector é um processo separado (`connector-local/`) que conhece o schema legado
e executa SQL somente leitura. Ele não recebe `DATABASE_URL` do Railway.

1. Copiar o repositório para o servidor da 3E e instalar as dependências:

   ```bash
   npm install
   ```

2. Configurar as variáveis de ambiente do conector (valores no cofre local, não no Git):

   | Variável | Papel |
   | --- | --- |
   | `TOPGERENTE_HOST` | Host do MySQL do Top Gerente |
   | `TOPGERENTE_PORT` | Porta do MySQL do Top Gerente |
   | `TOPGERENTE_DATABASE` | Base do legado |
   | `TOPGERENTE_USER` | Usuário `SELECT` |
   | `TOPGERENTE_PASSWORD` | Senha do usuário `SELECT` |
   | `TOPGERENTE_EMPRESA` | Código da empresa (padrão `1`) |
   | `CONNECTOR_SHARED_TOKEN` | Token que autentica o Railway → conector |
   | `RAILWAY_CALLBACK_URL` | URL de `POST /api/integracao/callback` no Railway |
   | `CONNECTOR_CALLBACK_TOKEN` | Mesmo valor configurado no app |
   | `PORT` | Porta HTTP local do conector (padrão `8787`) |

3. Subir o processo e conferir a saúde:

   ```bash
   npm --workspace connector-local run start
   curl http://localhost:8787/health
   ```

   O conector expõe `GET /health` e `POST /jobs/import-order`. Ele não escreve no
   Top Gerente e não implementa polling periódico.

## 2. Cloudflare Tunnel/Access

O túnel expõe **o serviço HTTP do conector**, nunca a porta 3306 do MySQL.

1. Instalar o `cloudflared` no servidor e autenticar na conta Cloudflare.
2. Criar um túnel nomeado e associar o hostname público (ex.: `conector.<dominio>`)
   apontando para `http://localhost:8787` na configuração de ingress.
3. Publicar o DNS do túnel para o hostname escolhido.
4. Proteger o hostname com **Cloudflare Access**: criar uma Access Application e uma
   policy que autorize apenas o Railway (service token ou mTLS). Sem essa policy o
   conector ficaria exposto a qualquer origem.
5. Instalar o `cloudflared` como serviço para que o túnel suba com o servidor.

## 3. Aplicativo no Railway

Configurar as variáveis do app (valores no cofre do Railway):

| Variável | Papel |
| --- | --- |
| `DATABASE_URL` | MySQL próprio do aplicativo |
| `SESSION_SECRET` | Assinatura do cookie de sessão |
| `LOCAL_CONNECTOR_BASE_URL` | URL pública do conector (`https://conector.<dominio>`) |
| `LOCAL_CONNECTOR_TOKEN` | Mesmo valor de `CONNECTOR_SHARED_TOKEN` |
| `CONNECTOR_CALLBACK_TOKEN` | Mesmo valor configurado no conector |
| `APP_INTERNAL_TOKEN` | Token das rotas internas |
| `APP_TIMEZONE` | `America/Sao_Paulo` |

**Não** colocar credenciais do Top Gerente no Railway: elas existem apenas no
ambiente local do conector.

## 4. Troca da AWS pelo Top Gerente real

Em desenvolvimento a integração lê uma instância AWS que simula o banco local. A
troca para o Top Gerente real é **somente de configuração** no conector: nenhuma
regra de negócio ou query muda, porque o adapter já fala com o legado por trás da
mesma porta.

1. Antes de trocar, importar um pedido conhecido contra a AWS e guardar o payload
   normalizado (número, cliente, vendedor e itens).
2. Apontar `TOPGERENTE_*` para o host, base e usuário `SELECT` do Top Gerente real e
   reiniciar o conector.
3. Importar o mesmo pedido pela interface e comparar com o payload de referência.
4. Confirmar que a categoria oficial do produto está disponível. A tabela
   `cad_produto` estava vazia na AWS; se continuar vazia no real, os itens entram
   como `PENDING_CLASSIFICATION` e são classificados depois (não bloqueia o go-live).
5. Critério de aceite: um pedido conhecido importa com número, cliente e itens
   corretos e repetir a importação do mesmo pedido **não duplica** registros.
6. Rollback: reverter `TOPGERENTE_*` para a AWS e reiniciar o conector.

## 5. Verificação pós-go-live

- `GET /health` do conector responde pelo hostname público protegido.
- Uma importação real de pedido conclui e o status do job é atualizado.
- Os logs não contêm senha, token, CPF completo nem payload comercial desnecessário.
- O MySQL legado não está exposto: apenas o hostname do conector responde; a porta
  3306 permanece fechada para a internet.

## Segurança

- Usuário MySQL do legado com `SELECT` somente nas tabelas necessárias.
- SQL parametrizado no conector; sem escrita no Top Gerente.
- Cloudflare Access/mTLS autenticando Railway → conector.
- Segredos apenas em variáveis de ambiente, nunca no código ou no repositório.
- Rotacionar os tokens do conector e do callback periodicamente.

## Pendências conhecidas

- Confirmar a categoria oficial do produto no Top Gerente real.
- Validar a query real com amostras conhecidas antes de liberar a troca.
- Criar o usuário `SELECT` no Top Gerente real com escopo restrito.
