---
name: integracao-top-gerente
description: Planeja e revisa qualquer alteração que leia o Top Gerente ou envolva conector local, jobs e Cloudflare. Use para importação/atualização de pedidos, queries legadas, retries e reconciliação. Do NOT use para CRUD interno sem relação com o legado.
---
# Integração Top Gerente

Leia `docs/integracao-top-gerente.md`, `docs/legado/estrutura-tabelas.md` e, somente se necessário, `docs/legado/schema-top-gerente.md`.

Regras:
- legado é somente leitura;
- nenhum `INSERT`, `UPDATE`, `DELETE`, DDL ou procedure que altere estado;
- sem polling contínuo;
- importação por pedido, assíncrona e idempotente;
- conector local consulta o legado e devolve payload ao Railway; não escreve diretamente no banco do app;
- preservar histórico operacional ao atualizar campos comerciais;
- divergências devem ser explícitas e auditáveis.

Antes de implementar query real, provar quais tabelas/colunas/joins são necessários com amostras conhecidas.
