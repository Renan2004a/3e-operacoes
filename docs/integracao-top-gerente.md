# Integração com o Top Gerente

## Objetivo

Importar ou atualizar um pedido específico sem polling contínuo e sem expor o MySQL legado à internet.

## Fluxo proposto

1. Usuário informa o número do pedido na interface do Railway.
2. `POST /api/integracao/pedidos` valida o número e cria `IntegrationJob` com chave idempotente.
3. API responde `202 Accepted` com `jobId`.
4. Worker/backend do Railway envia uma chamada HTTPS autenticada ao conector local pelo Cloudflare Tunnel/Access.
5. Conector local consulta somente as tabelas necessárias no MySQL Top Gerente com usuário `SELECT` e SQL parametrizado.
6. Conector normaliza o payload e envia callback para `POST /api/integracao/callback` no Railway usando token específico e escopo mínimo.
7. Aplicativo valida o payload com Zod, executa upsert do pedido/itens comerciais e atualiza o job.
8. Interface consulta o status do job e atualiza a tela quando concluído.

## Por que sem polling

A integração não varre o banco legado continuamente. Isso reduz carga imprevisível e evita consultas repetitivas sem necessidade. A leitura ocorre somente por requisição de importação/atualização de um pedido.

## Atualização de pedido existente

- Nova sincronização usa a chave comercial do pedido para upsert, nunca cria duplicata.
- Campos comerciais importados podem ser atualizados conforme a fonte oficial.
- Quantidade solicitada é atualizada automaticamente no app durante a sincronização.
- Registros operacionais do novo sistema são preservados.
- Conflitos entre nova quantidade comercial e produção/entrega existente geram `DIVERGENCIA`, log e intervenção.

## Segurança

- Cloudflare Tunnel expõe o **serviço HTTP do conector**, não a porta 3306.
- Usar Cloudflare Access/mTLS ou mecanismo equivalente para autenticar Railway → conector.
- Usuário MySQL do legado: `SELECT` somente nas tabelas necessárias.
- Credenciais do Top Gerente existem apenas no ambiente local do conector.
- Conector não recebe `DATABASE_URL` do Railway; devolve dados por callback HTTP autenticado.
- Nunca logar senha, token, CPF completo ou payload comercial desnecessário.

## Ponto ainda pendente

Mapear as tabelas e joins exatos do Top Gerente para pedido, itens, categoria, cliente e vendedor antes de implementar o adapter real. Usar `docs/legado/schema-top-gerente.md` como referência de descoberta, não como autorização para consultar tabelas indiscriminadamente.
