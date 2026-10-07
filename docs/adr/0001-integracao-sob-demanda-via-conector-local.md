# ADR 0001 - Integração sob demanda via conector local

## Status

Aceito.

## Contexto

O banco do Top Gerente está na rede local da 3E. O sistema novo será hospedado no Railway. Polling contínuo pode gerar carga desnecessária no legado e a porta MySQL não deve ser exposta.

## Decisão

Usar um conector HTTP local atrás de Cloudflare Tunnel/Access. O usuário informa o número do pedido no app; o backend cria job assíncrono; o conector consulta o legado com `SELECT` e devolve payload normalizado por callback HTTPS ao Railway.

## Consequências

- Sem polling contínuo.
- MySQL legado não é exposto publicamente.
- Necessário manter o computador/servidor local e o `cloudflared` disponíveis.
- Jobs precisam de idempotência, retry, auditoria e estados de falha.
- Query real do legado permanece pendente até confirmar tabelas/joins.
