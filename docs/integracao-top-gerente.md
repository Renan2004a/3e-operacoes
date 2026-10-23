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

## Transparência da reimportação

- A solicitação informa se houve **consulta nova**, reutilização de **tentativa em andamento** ou reutilização de **resultado anterior**. Resultado reutilizado não é apresentado como nova sincronização.
- Em consulta nova, o resultado distingue importação de pedido novo (`SUCCEEDED`/`IMPORTED`) de atualização de pedido existente (`SUCCEEDED`/`REIMPORTED`).
- O job devolve o `orderId` vinculado após sucesso; a interface oferece **“Abrir pedido”** sem alterar `createdAt` e sem depender dos filtros atuais da listagem.
- O polling só aceita o estado final antigo como resultado da consulta atual quando existe evento novo posterior à solicitação, evitando exibir sucesso antigo antes do novo despacho.

## Unidade e histórico operacional

- A unidade é comparada pela normalização de escrita existente; mudança real com execução, ocorrência, entrega, remessa programada ou atividade iniciada é bloqueada.
- O item mantém a unidade anterior e o histórico; a divergência (`UNIT_DIVERGENCE`) é registrada em auditoria, no evento do job e exibida ao Vendedor.
- Sem registros operacionais, a unidade e a quantidade solicitada são atualizadas na mesma transação. Não há conversão automática entre unidades.

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
