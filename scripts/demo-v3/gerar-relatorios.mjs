// Gera SRT combinado, transcrição, capítulos e relatórios da demonstração.
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'docs', 'video-demo-2026-10-29')
const FFMPEG = 'C:\\Users\\ratav\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe'
const FFPROBE = FFMPEG.replace('ffmpeg.exe', 'ffprobe.exe')

const partes = [
  { id: 'parte1-vendedor', titulo: 'Parte 1 — Apresentação, acesso e Vendedor' },
  { id: 'parte2-gerente', titulo: 'Parte 2 — Gerente de Produção' },
  { id: 'parte3-operador-expedicao', titulo: 'Parte 3 — Operador e Expedição' },
  { id: 'parte4-admin-tecnico', titulo: 'Parte 4 — Administração, Técnico e responsividade' },
  { id: 'parte5-banco', titulo: 'Parte 5 — Banco de dados' },
]

function duracao(arquivo) {
  const saida = execFileSync(FFPROBE, [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=nw=1:nk=1',
    arquivo,
  ])
  return Number(String(saida).trim())
}

const offsets = []
let acumulado = 0
for (const parte of partes) {
  const arquivo = path.join(DIR, `${parte.id}.mp4`)
  const segundos = duracao(arquivo)
  offsets.push({ ...parte, inicio: acumulado, duracao: segundos })
  acumulado += segundos
}

const fmt = (segundos) => {
  const s = Math.max(0, Math.round(segundos))
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const seg = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${seg}`
}

const todas = []
for (const parte of offsets) {
  const narracao = JSON.parse(
    fs.readFileSync(path.join(DIR, `${parte.id}-narracao.json`), 'utf8'),
  )
  for (const item of narracao) {
    todas.push({
      segundo: Math.round(parte.inicio + item.segundo),
      parte: parte.titulo,
      capitulo: item.capitulo,
      titulo: item.titulo,
      texto: item.texto,
    })
  }
}
todas.sort((a, b) => a.segundo - b.segundo)

const srt = todas
  .map((item, indice) => {
    const proximo = todas[indice + 1]
    const fim = proximo ? Math.max(item.segundo + 2, proximo.segundo) : item.segundo + 6
    return `${indice + 1}\n${fmt(item.segundo).replace(':', ':')},000 --> ${fmt(fim)},000\n${item.titulo}\n${item.texto}\n`
  })
  .join('\n')
  .replace(/(\d{2}:\d{2}:\d{2}),000/g, '$1,000')
fs.writeFileSync(path.join(DIR, 'demo-completa-2026-10-29.srt'), srt, 'utf8')
fs.writeFileSync(
  path.join(DIR, 'demo-completa-2026-10-29-transcricao.json'),
  JSON.stringify(todas, null, 2),
  'utf8',
)

// capítulos: cada mudança de capítulo
const capitulos = []
for (const item of todas) {
  const ultimo = capitulos.at(-1)
  if (!ultimo || ultimo.titulo !== item.capitulo) {
    capitulos.push({ inicio: item.segundo, titulo: item.capitulo })
  }
}
const capitulosTxt = capitulos
  .map((c) => `${fmt(c.inicio).slice(3, 8)} — ${c.titulo}`)
  .join('\n')
fs.writeFileSync(path.join(DIR, 'capitulos.txt'), capitulosTxt + '\n', 'utf8')

// ffmetadata para capítulos embutidos no MP4
const ffmeta = `;FFMETADATA1
title=3E Operações — demonstração completa
artist=3E Ferro e Aço
comment=Demonstração funcional com dados de teste (29/10/2026)
${capitulos
  .map((c, i) => {
    const fim = capitulos[i + 1]?.inicio ?? Math.round(acumulado)
    return `[CHAPTER]\nTIMEBASE=1/1000\nSTART=${c.inicio * 1000}\nEND=${fim * 1000}\ntitle=${c.titulo}`
  })
  .join('\n')}
`
fs.writeFileSync(path.join(DIR, 'capitulos.ffmeta'), ffmeta, 'utf8')

// relatório de cobertura
const linhas = []
for (const parte of offsets) {
  linhas.push(`\n## ${parte.titulo}\n`)
  linhas.push(`Início: **${fmt(parte.inicio)}** · duração: **${fmt(parte.duracao)}**\n`)
  const itens = todas.filter((t) => t.parte === parte.titulo)
  linhas.push('| Tempo | Capítulo | Demonstração |')
  linhas.push('| --- | --- | --- |')
  for (const item of itens) {
    const tempo = fmt(item.segundo - parte.inicio).slice(3, 8)
    linhas.push(`| ${tempo} | ${item.capitulo} | ${item.titulo} |`)
  }
}

const cobertura = `# Relatório de cobertura — demonstração 3E Operações (29/10/2026)

**Vídeo**: \`demo-completa-2026-10-29.mp4\` — ${fmt(acumulado)} (${(fs.statSync(path.join(DIR, 'demo-completa-2026-10-29.mp4')).size / 1024 / 1024).toFixed(1)} MB), 1920×1080, 30 fps, legendas queimadas e SRT separado.
**Ambiente**: aplicação local em \`http://localhost:3000\` com banco isolado \`3e_operacoes_demo\` (MySQL 8.4). Dados de cliente anonimizados.
**Partes**: 5 arquivos MP4 separados + vídeo concatenado.

## Índice de capítulos

${capitulosTxt}

## Cobertura por parte
${linhas.join('\n')}

## Inventário de telas e funcionalidades

| Área | Tela / funcionalidade | Onde |
| --- | --- | --- |
| Acesso | Login, validação de campos, credenciais inválidas, sessão | Parte 1 |
| Vendedor | Lista, filtros (setor, número, cliente, status, período), previsão, status | Parte 1 |
| Vendedor | Detalhe, resumo por unidade/setor, pendências, itens recolhíveis | Parte 1 |
| Vendedor | Prazo de entrega, histórico/auditoria, restauração | Parte 1 |
| Vendedor | Desmembramento por setor (sugestão + confirmação) | Parte 1 |
| Vendedor | Remessas somente leitura | Parte 1 |
| Vendedor | Importação: validação, sucesso, reimportação e idempotência | Parte 1 |
| Gerente | Painel, indicadores, alertas, ocorrências, atualização | Parte 2 |
| Gerente | Drill-down por status em nova aba, filtro divergente | Parte 2 |
| Gerente | Lista/detalhe de pedidos, prazo vencido, atraso comercial | Parte 2 |
| Gerente | Correção de setor com justificativa e auditoria | Parte 2 |
| Gerente | Remessa: criar, confirmar, remover | Parte 2 |
| Gerente | Entregas: situação, entregar tudo, confirmação, exceção | Parte 2 |
| Gerente | Impressão da ordem de produção | Parte 2 |
| Operador | Fila por setor, prioridade, status, divergência | Parte 3 |
| Operador | Execução de produção com recálculo de saldo | Parte 3 |
| Operador | Ocorrência (perda, motivo, quantidade, observação) e histórico | Parte 3 |
| Operador | Ordem de produção e impressão | Parte 3 |
| Expedição | Seleção de pedido, situação do item, entregar tudo | Parte 3 |
| Expedição | Confirmação, saldo insuficiente, bloqueio de exceção, quantidade inválida | Parte 3 |
| Administração | Usuários: criar, política de senha, inativar/ativar, explicação | Parte 4 |
| Administração | Setores, mapeamento categoria→setor (criar/atualizar) | Parte 4 |
| Técnico | Jobs, eventos, erros e importação | Parte 4 |
| Transversal | Página 404, bloqueio por permissão, responsividade 390px | Parte 4 |
| Banco | DBeaver (captura real), inventário, pedidos/itens, saldos | Parte 5 |
| Banco | Atividades, execuções, ocorrências, entregas, remessas | Parte 5 |
| Banco | Auditoria, usuários/perfis, jobs, estrutura/FKs, amostras | Parte 5 |
| Banco | Mapa tela→tabela e conclusão | Parte 5 |

## Observações de fidelidade

- Todas as ações de escrita foram executadas no banco isolado de demonstração.
- Mensagens de sucesso, erro e confirmação são reais; nenhuma foi simulada.
- O capítulo de banco usa consultas reais; a limitação do DBeaver está registrada em \`relatorio-pendencias.md\`.
- O vídeo não expõe senhas, tokens ou nomes reais de clientes.
`
fs.writeFileSync(path.join(DIR, 'relatorio-cobertura.md'), cobertura, 'utf8')

const csv = ['parte,tempo_absoluto,capitulo,titulo,texto']
for (const item of todas) {
  const linha = [item.parte, fmt(item.segundo), item.capitulo, item.titulo, item.texto]
    .map((v) => `"${String(v).replace(/"/g, '""')}"`)
    .join(',')
  csv.push(linha)
}
fs.writeFileSync(path.join(DIR, 'cobertura.csv'), csv.join('\n'), 'utf8')

console.log('Duração total:', fmt(acumulado))
console.log('Capítulos:', capitulos.length, '| legendas:', todas.length)
console.log('Arquivos gerados em', DIR)

