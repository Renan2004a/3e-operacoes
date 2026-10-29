# Demonstração completa — 3E Operações (29/10/2026)

## Vídeo

| Arquivo | Conteúdo | Duração |
| --- | --- | --- |
| `demo-completa-2026-10-29.mp4` | Vídeo final, 1920×1080, 30 fps, legendas queimadas e capítulos embutidos | **22:41** |
| `parte1-vendedor.mp4` | Apresentação, acesso, Vendedor, prazos, desmembramento e importação | 5:46 |
| `parte2-gerente.mp4` | Painel, alertas, pedidos, correção de setor, remessas, entregas e impressão | 5:07 |
| `parte3-operador-expedicao.mp4` | Fila, execução, ocorrências, ordem de produção, entregas e exceções | 4:19 |
| `parte4-admin-tecnico.mp4` | Usuários, setores/mapeamentos, Técnico, permissões e responsividade | 4:35 |
| `parte5-banco.mp4` | Banco: DBeaver, estrutura, dados, auditoria e mapa tela→tabela | 2:54 |

**Legendas**: `demo-completa-2026-10-29.srt` (181 legendas), `parte*-*.srt` por parte.
**Transcrição**: `demo-completa-2026-10-29-transcricao.json`.
**Capítulos**: `capitulos.txt` e metadados embutidos no MP4.

## Como a gravação foi feita

- Aplicação local em `http://localhost:3000` com o banco **isolado** `3e_operacoes_demo` (MySQL 8.4), criado para a demonstração.
- Todos os clientes foram anonimizados (`Cliente Demonstração <número>`), sem dados pessoais reais.
- Playwright em 1920×1080, com cursor destacado, pulso de clique, realce do alvo, legendas e cartões de capítulo injetados na página.
- Escritas reais na interface (prazo, desmembramento, correção de setor, remessa, entrega, execução, ocorrência, usuário e mapeamento), sempre no banco de demonstração.
- Importação real via conector local apontando para o Top Gerente (banco de teste).

## Capítulos

| Tempo | Capítulo |
| --- | --- |
| 00:00 | Apresentação do sistema |
| 00:31 | Acesso e autenticação |
| 01:03 | Vendedor — consulta, prazos e desmembramento |
| 03:12 | Vendedor — importação do Top Gerente |
| 05:46 | Gerente — painel e alertas |
| 07:23 | Gerente — pedidos, prazos, setor e remessas |
| 08:15 | Gerente — correção de setor e remessas |
| 09:17 | Gerente — entregas e exceções |
| 10:53 | Operador — fila, execução e ocorrências |
| 13:05 | Expedição — entregas e exceções |
| 15:12 | Administração — usuários, setores e mapeamentos |
| 17:33 | Responsável Técnico — integração |
| 18:17 | Validações, permissões e responsividade |
| 19:09 | Encerramento e pendências |
| 19:48 | Banco de dados — estrutura e persistência |

## Relatórios

- `relatorio-cobertura.md` — cobertura por capítulo e inventário de telas/funcionalidades.
- `cobertura.csv` — uma linha por legenda, com tempo absoluto e parte.
- `relatorio-pendencias.md` — limitações do ambiente e pendências funcionais.
- `mapa-telas-banco.md` — correspondência entre telas, tabelas e colunas.
- `resumo-tecnico.md` — ambiente, gates e limitações.

## Como reproduzir

```powershell
# 1. banco isolado (uma vez)
#    crie o banco 3e_operacoes_demo e aponte DATABASE_URL para ele
npx prisma migrate deploy
$env:SEED_ADMIN_PASSWORD="admin123"; $env:SEED_DEMO="1"; npm run prisma:seed

# 2. aplicação de produção local (sem o selo de desenvolvimento)
npm run build
npm start

# 3. conector local (opcional, para importação)
npm --workspace connector-local run start

# 4. gravação (cada parte gera webm + narração + SRT)
node scripts/demo-v3/parte1-vendedor.mjs
node scripts/demo-v3/parte2-gerente.mjs
node scripts/demo-v3/parte3-operador-expedicao.mjs
node scripts/demo-v3/parte4-admin-tecnico.mjs
node scripts/demo-v3/gerar-capitulo-banco.mjs
node scripts/demo-v3/parte5-banco.mjs

# 5. relatórios e SRT combinado
node scripts/demo-v3/gerar-relatorios.mjs
```

A conversão para MP4 e a concatenação usam `ffmpeg` (H.264, 1920×1080, 30 fps, CRF 22, `+faststart`).

## Limitação registrada

O DBeaver desta máquina apresentou texto invisível na árvore e no editor (defeito de renderização do ambiente). O capítulo de banco mostra a **captura real da janela**, declara a limitação e usa **consultas SQL reais executadas no MySQL**, com resultados e estrutura reais. Detalhes em `relatorio-pendencias.md`.

