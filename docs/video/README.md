# Vídeos de demonstração

Gravações automáticas do fluxo do 3E Operações (Playwright + Chromium), com
legendas que ficam visíveis por tempo proporcional ao texto.

| Arquivo | Duração | Modo | Conteúdo |
| --- | --- | --- | --- |
| `demo-3e.mp4` | ~1min27 | navegação | Versão curta. |
| `demo-3e-completo.mp4` | ~4min35 | navegação | Todas as telas, com cartões de seção e legendas lentas. |
| `demo-3e-execucao.mp4` | ~5min37 | **execução real** | Importa o pedido e **registra execução, ocorrência e entrega** (grava no banco do app). |

Os modos "navegação" não alteram dados: navegam e exibem as telas (em um ponto
preenchem um campo apenas para mostrar o formulário). O modo "execução real"
**grava** no banco próprio do app; o Top Gerente permanece somente leitura.

## Roteiro (versão completa / execução)

1. Abertura e login por perfil.
2. **Vendedor**: lista, pedido `70435`, cinco valores, desmembramento por setor,
   prazo e classificação.
3. **Gerente de Produção**: painel, pedidos, detalhe, fila e **importação**
   (na versão de execução, a importação é disparada e confirmada).
4. **Operador**: fila, **execução** (registra 5 un.), **ocorrência** (perda com
   motivo) e ordem de produção.
5. **Expedição**: entregas — na versão de execução, **registra a entrega**; na
   de navegação, mostra o fluxo de exceção (acima do disponível).
6. **Responsável de Sistema**: usuários, setores e mapeamento de categoria.
7. **Responsável Técnico**: jobs de integração e eventos.
8. Saldo atualizado, responsividade (celular) e logout.

## Como regenerar

```bash
npm run dev            # em outro terminal (porta 3000)

# versão de navegação (não grava dados)
npm run video:demo:completo

# versão de execução real (precisa do conector local no ar; GRAVA dados)
# PowerShell:
$env:MODO='execucao'; npm run video:demo:completo

# versão curta
npm run video:demo
```

Requisitos:

- app rodando em `http://localhost:3000` (banco configurado em `.env`);
- pedido `PEDIDO_DEMO` (padrão `70435`) já importado;
- para o modo `execucao`, o **conector local** no ar
  (`npm --workspace connector-local run start`, porta 8787);
- Playwright instalado (browsers) e um `ffmpeg` no PATH para o `.mp4`.

Os screenshots de cada passo ficam em `docs/video/steps*/` (não versionados).
