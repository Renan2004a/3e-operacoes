# DemonstraÃ§Ã£o completa â€” 3E OperaÃ§Ãµes (29/10/2026)

## VÃ­deo

| Arquivo | ConteÃºdo | DuraÃ§Ã£o |
| --- | --- | --- |
| `demo-completa-2026-10-29.mp4` | VÃ­deo final, 1920Ã—1080, 30 fps, legendas queimadas e capÃ­tulos embutidos | **21:47** |
| `parte1-vendedor.mp4` | ApresentaÃ§Ã£o, acesso, Vendedor, prazos, desmembramento e importaÃ§Ã£o | 5:46 |
| `parte2-gerente.mp4` | Painel, alertas, pedidos, correÃ§Ã£o de setor, remessas, entregas e impressÃ£o | 5:07 |
| `parte3-operador-expedicao.mp4` | Fila, execuÃ§Ã£o, ocorrÃªncias, ordem de produÃ§Ã£o, entregas e exceÃ§Ãµes | 3:23 |
| `parte4-admin-tecnico.mp4` | UsuÃ¡rios, setores/mapeamentos, TÃ©cnico, permissÃµes e responsividade | 4:34 |
| `parte5-banco.mp4` | Banco: DBeaver, estrutura, dados, auditoria e mapa telaâ†’tabela | 2:55 |

**Legendas**: `demo-completa-2026-10-29.srt` (172 legendas), `parte*-*.srt` por parte.
**TranscriÃ§Ã£o**: `demo-completa-2026-10-29-transcricao.json`.
**CapÃ­tulos**: `capitulos.txt` e metadados embutidos no MP4.

## Como a gravaÃ§Ã£o foi feita

- AplicaÃ§Ã£o local em `http://localhost:3000` com o banco **isolado** `3e_operacoes_demo` (MySQL 8.4), criado para a demonstraÃ§Ã£o.
- Todos os clientes foram anonimizados (`Cliente DemonstraÃ§Ã£o <nÃºmero>`), sem dados pessoais reais.
- Playwright em 1920Ã—1080, com cursor destacado, pulso de clique, realce do alvo, legendas e cartÃµes de capÃ­tulo injetados na pÃ¡gina.
- Escritas reais na interface (prazo, desmembramento, correÃ§Ã£o de setor, remessa, entrega, execuÃ§Ã£o, ocorrÃªncia, usuÃ¡rio e mapeamento), sempre no banco de demonstraÃ§Ã£o.
- ImportaÃ§Ã£o real via conector local apontando para o Top Gerente (banco de teste).

## CapÃ­tulos

| Tempo | CapÃ­tulo |
| --- | --- |
| 00:00 | ApresentaÃ§Ã£o do sistema |
| 00:31 | Acesso e autenticaÃ§Ã£o |
| 01:03 | Vendedor â€” consulta, prazos e desmembramento |
| 03:12 | Vendedor â€” importaÃ§Ã£o do Top Gerente |
| 05:46 | Gerente â€” painel e alertas |
| 07:23 | Gerente â€” pedidos, prazos, setor e remessas |
| 08:15 | Gerente â€” correÃ§Ã£o de setor e remessas |
| 09:17 | Gerente â€” entregas e exceÃ§Ãµes |
| 10:53 | Operador â€” fila, execuÃ§Ã£o e ocorrÃªncias |
| 13:06 | ExpediÃ§Ã£o â€” entregas e exceÃ§Ãµes |
| 14:17 | AdministraÃ§Ã£o â€” usuÃ¡rios, setores e mapeamentos |
| 16:38 | ResponsÃ¡vel TÃ©cnico â€” integraÃ§Ã£o |
| 17:22 | ValidaÃ§Ãµes, permissÃµes e responsividade |
| 18:14 | Encerramento e pendÃªncias |
| 18:52 | Banco de dados â€” estrutura e persistÃªncia |

## RelatÃ³rios

- `relatorio-cobertura.md` â€” cobertura por capÃ­tulo e inventÃ¡rio de telas/funcionalidades.
- `cobertura.csv` â€” uma linha por legenda, com tempo absoluto e parte.
- `relatorio-pendencias.md` â€” limitaÃ§Ãµes do ambiente e pendÃªncias funcionais.
- `mapa-telas-banco.md` â€” correspondÃªncia entre telas, tabelas e colunas.
- `resumo-tecnico.md` â€” ambiente, gates e limitaÃ§Ãµes.

## Como reproduzir

```powershell
# 1. banco isolado (uma vez)
#    crie o banco 3e_operacoes_demo e aponte DATABASE_URL para ele
npx prisma migrate deploy
$env:SEED_ADMIN_PASSWORD="admin123"; $env:SEED_DEMO="1"; npm run prisma:seed

# 2. aplicaÃ§Ã£o de produÃ§Ã£o local (sem o selo de desenvolvimento)
npm run build
npm start

# 3. conector local (opcional, para importaÃ§Ã£o)
npm --workspace connector-local run start

# 4. gravaÃ§Ã£o (cada parte gera webm + narraÃ§Ã£o + SRT)
node scripts/demo-v3/parte1-vendedor.mjs
node scripts/demo-v3/parte2-gerente.mjs
node scripts/demo-v3/parte3-operador-expedicao.mjs
node scripts/demo-v3/parte4-admin-tecnico.mjs
node scripts/demo-v3/gerar-capitulo-banco.mjs
node scripts/demo-v3/parte5-banco.mjs

# 5. relatÃ³rios e SRT combinado
node scripts/demo-v3/gerar-relatorios.mjs
```

A conversÃ£o para MP4 e a concatenaÃ§Ã£o usam `ffmpeg` (H.264, 1920Ã—1080, 30 fps, CRF 22, `+faststart`).

## LimitaÃ§Ã£o registrada

O DBeaver desta mÃ¡quina apresentou texto invisÃ­vel na Ã¡rvore e no editor (defeito de renderizaÃ§Ã£o do ambiente). O capÃ­tulo de banco mostra a **captura real da janela**, declara a limitaÃ§Ã£o e usa **consultas SQL reais executadas no MySQL**, com resultados e estrutura reais. Detalhes em `relatorio-pendencias.md`.

