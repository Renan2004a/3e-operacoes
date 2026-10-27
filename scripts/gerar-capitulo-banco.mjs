import mysql from 'mysql2/promise'
import fs from 'node:fs'

const env = {}
for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
}
const url = new URL(env.DATABASE_URL)
const conexao = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
})

const q = async (sql) => (await conexao.query(sql))[0]
const contagens = await q(`
  SELECT 'pedidos' AS tabela, COUNT(*) AS total FROM pedidos
  UNION ALL SELECT 'pedidos_itens', COUNT(*) FROM pedidos_itens
  UNION ALL SELECT 'atividades', COUNT(*) FROM atividades
  UNION ALL SELECT 'execucoes', COUNT(*) FROM execucoes
  UNION ALL SELECT 'ocorrencias', COUNT(*) FROM ocorrencias
  UNION ALL SELECT 'entregas', COUNT(*) FROM entregas
  UNION ALL SELECT 'remessas_programadas', COUNT(*) FROM remessas_programadas
  UNION ALL SELECT 'logs_auditoria', COUNT(*) FROM logs_auditoria
`)
const itens = await q(`
  SELECT p.legacyNumber AS pedido, i.description AS item, i.unit AS unidade,
         i.requestedQuantity AS solicitado, i.deadlineAt AS previsao,
         a.status AS status, s.name AS setor
  FROM pedidos p
  JOIN pedidos_itens i ON i.orderId = p.id
  LEFT JOIN atividades a ON a.orderItemId = i.id
  LEFT JOIN setores s ON s.id = a.sectorId
  ORDER BY p.createdAt DESC, i.createdAt ASC LIMIT 10
`)
const ocorrencias = await q(`
  SELECT o.type AS tipo, o.quantity AS quantidade, o.occurredAt AS quando,
         u.name AS responsavel, m.descricao AS motivo
  FROM ocorrencias o
  JOIN usuarios u ON u.id = o.userId
  LEFT JOIN motivos_ocorrencia m ON m.id = o.motivoId
  ORDER BY o.occurredAt DESC LIMIT 5
`)
const entregas = await q(`
  SELECT e.quantity AS quantidade, e.occurredAt AS quando, u.name AS responsavel
  FROM entregas e JOIN usuarios u ON u.id = e.userId
  ORDER BY e.occurredAt DESC LIMIT 5
`)
const auditoria = await q(`
  SELECT beforeJson, afterJson, createdAt
  FROM logs_auditoria WHERE action = 'DEADLINE_CHANGED'
  ORDER BY createdAt DESC LIMIT 5
`)
const remessas = await q(`
  SELECT remessa, scheduledAt, confirmedAt
  FROM remessas_programadas ORDER BY createdAt DESC LIMIT 5
`)

function esc(v) {
  return String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function qtd(v) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n)
    ? n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })
    : esc(v)
}
function data(v) {
  if (!v) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(v))
}
function dia(v) {
  if (!v) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(v))
}
function prazoDoJson(json) {
  if (!json || typeof json !== 'object') return null
  const d = json.deadlineAt
  return typeof d === 'string' ? d : null
}
function tabela(cabecalhos, linhas) {
  return `<table><thead><tr>${cabecalhos.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${linhas
    .map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`
}

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Capítulo de banco — 3E Operações</title>
<style>
  :root { --paper:#f6f7f9; --ink:#0f172a; --muted:#64748b; --line:#cbd5e1; --accent:#0e7490; --blue:#1d4ed8; }
  * { box-sizing:border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:"Segoe UI",Arial,sans-serif; }
  .wrap { max-width:1180px; margin:0 auto; padding:40px 36px 180px; }
  header.hero { padding:36px; border-radius:18px; background:linear-gradient(135deg,#0f172a,#155e75); color:#fff; }
  header.hero h1 { margin:8px 0 6px; font-size:34px; }
  header.hero p { margin:0; color:#bae6fd; font-size:17px; }
  .kicker { color:#67e8f9; font-size:12px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; }
  section { margin-top:30px; padding:24px; background:#fff; border:1px solid var(--line); border-radius:14px; }
  h2 { margin:0 0 6px; font-size:22px; }
  p.sub { margin:0 0 14px; color:var(--muted); font-size:15px; }
  .split { display:grid; grid-template-columns:minmax(0,1.05fr) minmax(0,1fr); gap:18px; align-items:start; }
  img.shot { width:100%; border:1px solid var(--line); border-radius:10px; }
  .note { padding:12px 14px; border-left:4px solid var(--accent); background:#ecfeff; border-radius:8px; color:#155e75; font-size:14px; }
  pre { margin:0; padding:14px; background:#0f172a; color:#e2e8f0; border-radius:10px; font-size:13px; line-height:1.45; overflow:auto; }
  table { width:100%; border-collapse:collapse; font-size:13px; }
  th { text-align:left; padding:8px; background:#f1f5f9; border-bottom:2px solid var(--line); color:#475569; text-transform:uppercase; font-size:11px; letter-spacing:.04em; }
  td { padding:8px; border-bottom:1px solid #e2e8f0; vertical-align:top; }
  .grid3 { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; }
  .card { padding:14px; border:1px solid var(--line); border-radius:10px; background:#f8fafc; }
  .card strong { display:block; font-size:14px; margin-bottom:4px; }
  .card span { color:var(--muted); font-size:13px; }
  .flow { display:flex; flex-wrap:wrap; gap:8px; align-items:center; font-size:14px; }
  .flow b { padding:7px 11px; border:1px solid #94a3b8; border-radius:8px; background:#fff; }
  .flow i { color:#64748b; font-style:normal; }
  .legend { display:flex; gap:14px; flex-wrap:wrap; font-size:12px; color:var(--muted); margin-top:8px; }
</style></head>
<body><div class="wrap">
  <header class="hero">
    <div class="kicker">3E Operações · capítulo de banco de dados</div>
    <h1>Onde os dados são lidos e gravados</h1>
    <p>DBeaver instalado no ambiente, conexões <b>topgerente</b> e <b>3e_operacoes</b>, tabelas e consultas reais do dia 27/10/2026.</p>
  </header>

  <section id="dbeaver">
    <h2>1. DBeaver: as duas conexões</h2>
    <p class="sub">O Top Gerente é a fonte oficial do comercial (somente leitura). O app grava no banco <b>3e_operacoes</b>.</p>
    <div class="split">
      <img class="shot" src="dbeaver-test.png" alt="Janela do DBeaver com as conexões localhost e topgerente">
      <div>
        <div class="note"><b>topgerente</b>: pedidos, itens, clientes e vendedores do ERP. O app nunca escreve aqui; o conector local faz <code>SELECT</code> parametrizado.</div>
        <div class="note" style="margin-top:10px;border-color:#1d4ed8;background:#eff6ff;color:#1e3a8a"><b>3e_operacoes</b>: snapshot do pedido + produção, ocorrências, entregas, remessas, usuários e auditoria. É aqui que o app grava.</div>
        <div class="legend"><span>● verde: conexão ativa</span><span>● cinza: disponível</span><span>Fonte: janela do DBeaver</span></div>
      </div>
    </div>
  </section>

  <section id="mapa">
    <h2>2. Mapa das tabelas do app</h2>
    <p class="sub">O caminho do dado acompanha a operação: pedido → item → atividade → execução/ocorrência; a entrega e a previsão ficam no item.</p>
    <div class="flow">
      <b>pedidos</b><i>→</i><b>pedidos_itens</b><i>→</i><b>atividades</b><i>→</i><b>execucoes</b>
      <i>·</i><b>ocorrencias</b><i>·</i><b>entregas</b><i>·</i><b>remessas_programadas</b><i>·</i><b>logs_auditoria</b>
    </div>
    <div class="note" style="margin-top:12px">A previsão de entrega do item fica em <code>pedidos_itens.deadlineAt</code>. As remessas são datas previstas em <code>remessas_programadas</code>; as entregas realizadas ficam em <code>entregas</code>.</div>
  </section>

  <section id="contagens">
    <h2>3. Volume atual</h2>
    <p class="sub">Consulta de contagem, somente leitura, no banco do app.</p>
    ${tabela(['Tabela', 'Registros'], contagens.map((c) => [`<code>${esc(c.tabela)}</code>`, qtd(c.total)]))}
  </section>

  <section id="pedido">
    <h2>4. Pedido → item → atividade</h2>
    <p class="sub">Amostra dos pedidos mais recentes. A previsão e o setor vêm do item e da atividade.</p>
    ${tabela(
      ['Pedido', 'Item', 'Un.', 'Solicitado', 'Previsão', 'Status', 'Setor'],
      itens.map((i) => [
        esc(i.pedido),
        esc(i.item),
        esc(i.unidade),
        qtd(i.solicitado),
        dia(i.previsao),
        esc(i.status ?? '—'),
        esc(i.setor ?? 'Não classificado'),
      ]),
    )}
  </section>

  <section id="ocorrencias">
    <h2>5. Ocorrências e entregas</h2>
    <p class="sub">O Operador grava ocorrências; a Expedição grava entregas. O Gerente lê as duas.</p>
    <div class="grid3">
      <div class="card"><strong>Ocorrências recentes</strong><span>${ocorrencias.length ? ocorrencias.map((o) => `${esc(o.tipo)} · ${esc(o.responsavel)} · ${dia(o.quando)}`).join('<br>') : 'Nenhuma ocorrência.'}</span></div>
      <div class="card"><strong>Entregas recentes</strong><span>${entregas.length ? entregas.map((e) => `${qtd(e.quantidade)} · ${esc(e.responsavel)} · ${dia(e.quando)}`).join('<br>') : 'Nenhuma entrega.'}</span></div>
      <div class="card"><strong>Remessas programadas</strong><span>${remessas.length ? remessas.map((r) => `${r.remessa}ª · ${dia(r.scheduledAt)}${r.confirmedAt ? ' · confirmada' : ''}`).join('<br>') : 'Nenhuma remessa.'}</span></div>
    </div>
  </section>

  <section id="auditoria">
    <h2>6. Histórico de prazos (auditoria)</h2>
    <p class="sub">Toda alteração de prazo grava uma linha em <code>logs_auditoria</code> com antes, depois, usuário e data/hora.</p>
    <pre>SELECT beforeJson, afterJson, createdAt
FROM logs_auditoria
WHERE action = 'DEADLINE_CHANGED'
ORDER BY createdAt DESC LIMIT 5;</pre>
    <div style="margin-top:14px">
      ${tabela(
        ['Quando', 'Antes', 'Depois'],
        auditoria.map((a) => [data(a.createdAt), dia(prazoDoJson(a.beforeJson)), dia(prazoDoJson(a.afterJson))]),
      )}
    </div>
    <div class="note" style="margin-top:12px">A alteração acima foi feita pelo Gerente na demonstração: o prazo foi para 13/12/2026 e voltou para 06/12/2026. As duas linhas permanecem para auditoria; o valor atual do item é o último “depois”.</div>
  </section>

  <section id="fim">
    <h2>7. Leitura × escrita</h2>
    <div class="grid3">
      <div class="card"><strong>Top Gerente</strong><span>Somente <code>SELECT</code> via conector local. Nenhum dado comercial é alterado pelo 3E.</span></div>
      <div class="card"><strong>App (3e_operacoes)</strong><span>Importação, desmembramento, prazos, execuções, ocorrências, entregas, remessas, usuários e logs.</span></div>
      <div class="card"><strong>Auditoria</strong><span>Prazos, importações e alterações de cadastro deixam rastro em <code>logs_auditoria</code>.</span></div>
    </div>
  </section>
</div></body></html>`

fs.writeFileSync('docs/video/capitulo-banco.html', html, 'utf8')
console.log('HTML gerado: docs/video/capitulo-banco.html')
console.log('Contagens:', contagens)
console.log('Auditoria de prazos:', auditoria.length, 'linha(s)')
await conexao.end()
