# Demonstração completa — 3E Operações (27/10/2026)

**Arquivo**: `demo-completa-2026-10-27.mp4` (8m43s, 1280×800, legendas queimadas, sem áudio)
**Transcrição**: `demo-completa-2026-10-27-transcricao.json` (tempo, título e texto de cada legenda do app)
**Capítulo de banco**: `capitulo-banco.html` (consultas reais) + `dbeaver-test.png` (janela do DBeaver)

---

## Capítulos

| Tempo | Capítulo | Conteúdo |
| --- | --- | --- |
| 00:00–06:25 | **Fluxo do app** | Login por perfil; Vendedor (lista, filtros, detalhe, prazos, histórico, desmembramento, sem remessas); Gerente (painel, alertas, ocorrências, atualização, pedidos, detalhe, remessa automática); Operador (fila, execução, ocorrências, ordem/impressão); Expedição (entregas, previsão, exceção); Admin (usuários, inativação, setores, mapeamento); Técnico (jobs/eventos); Importação |
| 06:25–07:31 | **Alteração de prazo** | Item com prazo no pedido 82249: alteração para +7 dias, gravação, histórico com antes/depois e restauração do valor original |
| 07:31–08:43 | **Banco de dados** | DBeaver (conexões), mapa das tabelas, contagens, pedido/item/atividade, ocorrências, entregas, remessas e histórico de prazos em `logs_auditoria` |

---

## O que foi executado de verdade

- **Login** nos cinco perfis (Vendedor, Gerente, Operador, Expedição, Administrador).
- **Leitura** de todas as telas, filtros, expansão/recolhimento de itens, painel e atualização, jobs de integração, impressão.
- **Remessa**: criação com número automático e remoção com confirmação (sem resíduo).
- **Prazo**: alteração e restauração no pedido 82249. O vídeo mostra as duas primeiras linhas de `logs_auditoria`; gravações repetidas deixaram **quatro** linhas de `DEADLINE_CHANGED` no mesmo item (auditoria preservada), com o valor atual em 06/12/2026.
- **Consultas reais** no banco do app para o capítulo de banco (somente leitura).

## O que foi mostrado como formulário, sem enviar

Para **não alterar dados de produção** (o banco do app é compartilhado com o ambiente de demonstração), estas ações foram preenchidas e explicadas, mas **não confirmadas**:

- Importação de pedido (o conector local não está disponível neste ambiente).
- Registro de execução do Operador.
- Registro de ocorrência.
- Registro de entrega e exceção.
- Criação de usuário e confirmação de inativação.
- Salvar mapeamento de categoria.

> Para gravar uma versão com essas ações concluídas, use um **banco de teste separado** (`3e_operacoes_test`), rode `prisma migrate deploy` + seed e aponte `DATABASE_URL` para ele. O roteiro e os scripts estão em `scripts/gravar-demo-completa-2026-10-27.mjs`, `scripts/gravar-demo-prazo.mjs` e `scripts/gravar-capitulo-banco.mjs`.

---

## Sobre o capítulo de banco / DBeaver

- O DBeaver está instalado no ambiente; a captura mostra a janela real com as conexões `topgerente` e `localhost`.
- O desktop do agente é **kiosk** (a janela visível é a do OpenCode), então a navegação ao vivo dentro do DBeaver não pôde ser roteirizada com segurança. Para não inventar dados, o capítulo combina:
  - a **captura real da janela do DBeaver**;
  - o **mapa das tabelas**;
  - **consultas SQL reais** e seus resultados, executados no banco do app.
- As consultas estão em `capitulo-banco.html`; copie o SQL para o DBeaver para reproduzir.

---

## Como reproduzir a gravação

```bash
# app local
npm run dev

# 1) fluxo completo (gera webm + transcrição)
node scripts/gravar-demo-completa-2026-10-27.mjs

# 2) complemento de prazo
node scripts/gravar-demo-prazo.mjs

# 3) capítulo de banco (HTML + consultas reais)
node scripts/gerar-capitulo-banco.mjs
node scripts/gravar-capitulo-banco.mjs

# 4) converter e concatenar (ffmpeg)
#    ver comandos usados em docs/testes-locais.md §11
```

## Arquivos

| Arquivo | Uso |
| --- | --- |
| `demo-completa-2026-10-27.mp4` | Vídeo final legendado |
| `demo-completa-2026-10-27-transcricao.json` | Transcrição com tempos |
| `capitulo-banco.html` | Roteiro do banco + resultados reais |
| `dbeaver-test.png` | Captura da janela do DBeaver |
| `validacao-ui/` | Evidências das correções de UI |
| `validacao-prod/` | Evidências da produção |
