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

## Nova tentativa após falha

- Uma solicitação depois de um job `FAILED` cria um novo job de tentativa (`<job falho>:retry`) e agenda novo despacho, inclusive dentro da janela de 60 s e para um job falho antigo. O job falho anterior é preservado para auditoria.
- Enquanto a tentativa mais recente estiver ativa (`PENDING`, `DISPATCHED` ou `RUNNING`) e dentro da janela, novas solicitações reutilizam esse job e não disparam outro processamento. Fora da janela, um job `SUCCEEDED` é reimportado e um job ativo antigo pode ser recuperado.
- A reserva do despacho é atômica e usa o carimbo da tentativa: apenas a execução que encontra o job no estado capturado o move para `DISPATCHED`; cliques repetidos não chamam o conector duas vezes para o mesmo job.
- A interface mantém o número informado, oferece **“Tentar novamente”** após a falha e acompanha o novo `jobId`, sem reutilizar status ou eventos da tentativa anterior.
- Os códigos técnicos continuam nos logs e podem ser exibidos para suporte; a mensagem principal é traduzida para o usuário.

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
