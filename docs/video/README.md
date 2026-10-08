# Vídeo de demonstração

`demo-3e.mp4` — gravação automática do fluxo principal do 3E Operações
(Playwright + Chromium), com legendas. Não altera dados: apenas navega e exibe
as telas.

## Roteiro do vídeo

1. Login por perfil (o servidor decide o que cada um vê).
2. Vendedor: lista de pedidos, pedido `70435`, os cinco valores por item e o
   **desmembramento por setor**.
3. Gerente: painel (produção/atividades por setor) e importação por número.
4. Operador: fila, execução da atividade e ordem de produção (impressão).
5. Expedição: itens disponíveis e registro de entrega.
6. Sistema: usuários e setores.
7. Responsividade: as mesmas telas no celular.

## Como regenerar

```bash
npm run dev            # em outro terminal (porta 3000)
npm run video:demo     # grava e gera docs/video/demo-3e.mp4
```

Requisitos:

- app rodando em `http://localhost:3000` (banco configurado em `.env`);
- pedido `PEDIDO_DEMO` (padrão `70435`) já importado;
- Playwright instalado (browsers) e um `ffmpeg` no PATH para o `.mp4`
  (sem ele, gera apenas o `.webm`, que abre no navegador).

Os screenshots de cada passo ficam em `docs/video/steps/` (não versionados).
