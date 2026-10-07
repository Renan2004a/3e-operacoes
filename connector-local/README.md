# Conector local do Top Gerente

Processo executado em um computador/servidor sempre ligado na rede da 3E. Ele fica atrás do Cloudflare Tunnel/Access e possui acesso local ao MySQL do Top Gerente.

## Responsabilidades

- receber uma solicitação autenticada contendo `jobId` e número do pedido;
- consultar o legado com credencial `SELECT`;
- montar payload mínimo e normalizado;
- devolver o resultado ao endpoint de callback no Railway;
- registrar falhas técnicas sem expor segredos.

## Não fazer

- não escrever no Top Gerente;
- não expor MySQL diretamente pelo túnel;
- não receber `DATABASE_URL` do banco Railway;
- não guardar senha/token no código;
- não implementar polling periódico.

A query real só deve ser implementada depois de confirmar as tabelas/joins no dump e validar o resultado com amostras conhecidas.
