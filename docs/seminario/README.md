# Seminário técnico — como o 3E Operações foi construído com um agente de IA

Arquivo principal: **`seminario-3e-operacoes-2026-11-12.pptx`** (35 slides, 16:9, com notas do apresentador em todos os slides).

## Estrutura

| Ato | Tema | Quem | Tempo |
|---|---|---|---|
| 0 | Abertura e tese | Renan | 2 min |
| 1 | Levantamento de requisitos | Renan | 8 min |
| 2 | Modelagem de banco de dados | Marcelo | 10 min |
| 3 | Escolha de ferramentas | Vanessa | 6 min |
| 4 | Tasks e execução | Vanusa | 13 min |
| 5 | Modelo, skills, agentes e prompts | Renan + todos | 10 min |
| 6 | Fechamento e perguntas | Todos | 2 + 10 min |

Total: ~50 min de apresentação + 10 min de perguntas.

## O que cada bloco usa como evidência

- **Ato 1**: `AGENTS.md`, página "Perguntas para o time" (Notion), 18 respostas registradas.
- **Ato 2**: DER/MER, dicionário de tabelas, `docs/banco-3e-operacoes-2026-11-04.docx`, ETL com 0 órfãos.
- **Ato 3**: tabela decisão × restrição × descartado; Railway × Vercel; Cloudflare Tunnel + usuário `SELECT`.
- **Ato 4**: prompt real da divisão em 4 trilhas, backlog T00.1–T11.6, PRs #32–#34, 1.182 testes, captura real do sistema.
- **Ato 5**: 6 → 7 skills, 6 subagentes somente leitura, rodada de prompts de 1 min por pessoa.

## Notas do apresentador

O texto de fala está nas **notas de cada slide** (aba "Anotações" no PowerPoint). Elas incluem tempo, o que enfatizar e a frase de transição. Não é roteiro para ler: é apoio.

## Como editar

1. Abra no PowerPoint (ou LibreOffice Impress).
2. O layout é 16:9 (13,33 × 7,5 in), fontes Segoe UI e Consolas.
3. Cada bloco de texto é uma caixa separada — não há grupos, então é fácil mover ou reescrever.
4. Se mudar o tempo de um ato, ajuste também a tabela do slide 4 e o rodapé do divisor correspondente.

## Como regerar

```bash
python scripts/gerar-slides-seminario.py
```

O script reescreve o `.pptx` a partir do conteúdo e dos diagramas em `docs/diagramas/`.
A prévia de layout (para conferência, não para entregar) é gerada com:

```bash
python scripts/render-pptx-preview.py
```

As imagens ficam em `docs/seminario/preview/`.

## Assets

- `docs/diagramas/mer-banco-pt-v2.png` — MER usado no slide 15.
- `docs/seminario/frames/app-pedido.png` — captura real da demonstração (pedido 70435), usada no slide 26.

## Antes de apresentar

- [ ] Rotacionar a senha do RDS e a senha do banco que estavam expostas na página pública do Notion.
- [ ] Remover as credenciais da página pública (ou restringir o compartilhamento).
- [ ] Se for projetar o Notion ao vivo, usar prints com os campos redigidos.
- [ ] Testar o arquivo no computador da apresentação (fonte e proporção).
- [ ] Ensaiar a rodada de prompts com cronômetro (1 min por pessoa).
- [ ] Ter o vídeo e o DOCX do banco à mão para as perguntas.

## Observação sobre os prompts

O único prompt citado literalmente é o da divisão do trabalho, registrado no Notion:

> "Como dividir essas tasks em uma equipe de 4 pessoas que usam spec driven e querem trabalhar de forma paralela?"

Os demais são **padrões de prompt** usados no projeto, apresentados como exemplo — não como citação histórica. O slide 31 deixa isso explícito.
