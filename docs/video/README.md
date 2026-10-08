# Vídeos de demonstração

Gravações automáticas do fluxo do 3E Operações (Playwright + Chromium), com
legendas. Não alteram dados: navegam, exibem as telas e, em alguns pontos,
preenchem campos apenas para mostrar o formulário (nada é enviado).

| Arquivo | Duração | Conteúdo |
| --- | --- | --- |
| `demo-3e.mp4` | ~1min27 | Versão curta: login, vendedor (pedido + desmembramento), painel, operador, expedição, admin e responsividade. |
| `demo-3e-completo.mp4` | ~2min54 | Versão completa e mais lenta, com cartões de seção, cobrindo todas as telas. |

## Roteiro do vídeo completo

1. Abertura e login por perfil.
2. **Vendedor**: lista de pedidos, pedido `70435`, cinco valores por item,
   **desmembramento por setor**, prazo e classificação.
3. **Gerente de Produção**: painel (produção/atividades por setor), pedidos,
   detalhe do pedido, fila e importação.
4. **Operador**: fila, execução da atividade, ocorrência e ordem de produção.
5. **Expedição**: entregas e o fluxo de exceção (entrega acima do disponível).
6. **Responsável de Sistema**: usuários, setores e mapeamento de categoria.
7. **Responsável Técnico**: jobs de integração e eventos.
8. Responsividade (celular) e logout.

## Como regenerar

```bash
npm run dev                 # em outro terminal (porta 3000)
npm run video:demo          # versão curta  -> docs/video/demo-3e.mp4
npm run video:demo:completo # versão completa -> docs/video/demo-3e-completo.mp4
```

Requisitos:

- app rodando em `http://localhost:3000` (banco configurado em `.env`);
- pedido `PEDIDO_DEMO` (padrão `70435`) já importado;
- Playwright instalado (browsers) e um `ffmpeg` no PATH para o `.mp4`
  (sem ele, gera apenas o `.webm`, que abre no navegador).

Os screenshots de cada passo ficam em `docs/video/steps*/` (não versionados).
