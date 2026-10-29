// Gera o capítulo de banco (HTML) com estrutura, dados e consultas reais do
// banco de demonstração. Uso: node scripts/demo-v3/gerar-capitulo-banco.mjs
import fs from 'node:fs'
import path from 'node:path'
import mysql from 'mysql2/promise'

function lerEnv(caminho) {
  const env = {}
  for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const env = lerEnv('.env')
const url = new URL(env.DATABASE_URL)
const conexao = await mysql.createConnection({
  host: url.hostname,
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database: url.pathname.replace(/^\//, ''),
})
const banco = url.pathname.replace(/^\//, '')
const q = async (sql, params = []) => (await conexao.query(sql, params))[0]

const tabelas = (await q('SHOW TABLES')).map((linha) => Object.values(linha)[0])
const estrutura = {}
const contagens = {}
const amostras = {}
for (const nomeTabela of tabelas) {
  const colunas = await q(
    `SELECT COLUMN_NAME nome, COLUMN_TYPE tipo, IS_NULLABLE nulo, COLUMN_KEY chave, EXTRA extra
     FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION`,
    [banco, nomeTabela],
  )
  const fks = await q(
    `SELECT COLUMN_NAME coluna, REFERENCED_TABLE_NAME referencia, REFERENCED_COLUMN_NAME colunaRef
     FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL`,
    [banco, nomeTabela],
  )
  const indices = await q(
    `SELECT INDEX_NAME nome, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) colunas
     FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     GROUP BY INDEX_NAME ORDER BY INDEX_NAME`,
    [banco, nomeTabela],
  )
  estrutura[nomeTabela] = { colunas, fks, indices }
  contagens[nomeTabela] = (await q(`SELECT COUNT(*) total FROM \`${nomeTabela}\``))[0].total
  amostras[nomeTabela] = await q(`SELECT * FROM \`${nomeTabela}\` LIMIT 6`)
}

const pedidos = await q(`
  SELECT p.legacyNumber pedido, p.customerName cliente, COUNT(i.id) itens,
         MAX(i.deadlineAt) previsao,
         SUM(i.classificationStatus = 'PENDING_CLASSIFICATION') pendentes
  FROM pedidos p LEFT JOIN pedidos_itens i ON i.orderId = p.id
  GROUP BY p.id ORDER BY p.createdAt DESC`)

const saldos = await q(`
  SELECT p.legacyNumber pedido, i.description item, i.unit unidade,
         i.requestedQuantity solicitado,
         COALESCE(SUM(DISTINCT e.quantity), 0) executado,
         COALESCE(SUM(DISTINCT d.quantity), 0) entregue,
         i.deadlineAt prazo
  FROM pedidos p
  JOIN pedidos_itens i ON i.orderId = p.id
  LEFT JOIN atividades a ON a.orderItemId = i.id
  LEFT JOIN execucoes e ON e.activityId = a.id
  LEFT JOIN entregas d ON d.orderItemId = i.id
  WHERE p.legacyNumber = '82268'
  GROUP BY i.id ORDER BY i.createdAt LIMIT 12`)

const atividades = await q(`
  SELECT s.name setor, a.status, a.priority prioridade,
         p.legacyNumber pedido, i.description item, i.unit unidade,
         i.requestedQuantity solicitado
  FROM atividades a
  JOIN setores s ON s.id = a.sectorId
  JOIN pedidos_itens i ON i.id = a.orderItemId
  JOIN pedidos p ON p.id = i.orderId
  ORDER BY a.priority DESC, a.createdAt LIMIT 15`)

const execucoes = await q(`
  SELECT u.name usuario, e.quantity quantidade, i.unit unidade,
         p.legacyNumber pedido, i.description item, e.occurredAt quando
  FROM execucoes e JOIN usuarios u ON u.id = e.userId
  JOIN atividades a ON a.id = e.activityId
  JOIN pedidos_itens i ON i.id = a.orderItemId
  JOIN pedidos p ON p.id = i.orderId
  ORDER BY e.occurredAt DESC LIMIT 10`)

const ocorrencias = await q(`
  SELECT o.type tipo, o.quantity quantidade, o.durationMin duracao,
         m.descricao motivo, u.name responsavel, p.legacyNumber pedido,
         s.name setor, o.occurredAt quando
  FROM ocorrencias o JOIN usuarios u ON u.id = o.userId
  LEFT JOIN motivos_ocorrencia m ON m.id = o.motivoId
  JOIN atividades a ON a.id = o.activityId
  JOIN pedidos_itens i ON i.id = a.orderItemId
  JOIN pedidos p ON p.id = i.orderId
  JOIN setores s ON s.id = a.sectorId
  ORDER BY o.occurredAt DESC LIMIT 10`)

const entregas = await q(`
  SELECT p.legacyNumber pedido, i.description item, e.quantity quantidade,
         i.unit unidade, u.name responsavel, e.managerOverride excecao,
         e.occurredAt quando
  FROM entregas e JOIN usuarios u ON u.id = e.userId
  JOIN pedidos_itens i ON i.id = e.orderItemId
  JOIN pedidos p ON p.id = i.orderId
  ORDER BY e.occurredAt DESC LIMIT 10`)

const remessas = await q(`
  SELECT p.legacyNumber pedido, i.description item, r.remessa numero,
         r.scheduledAt prevista, r.confirmedAt confirmada
  FROM remessas_programadas r
  JOIN pedidos_itens i ON i.id = r.orderItemId
  JOIN pedidos p ON p.id = i.orderId
  ORDER BY p.legacyNumber, r.remessa`)

const auditoria = await q(`
  SELECT action acao, entityType entidade, beforeJson antes, afterJson depois,
         reason motivo, userId usuario, createdAt quando
  FROM logs_auditoria ORDER BY createdAt DESC LIMIT 12`)

const usuarios = await q(`
  SELECT u.name nome, u.email, u.status,
         GROUP_CONCAT(DISTINCT up.role ORDER BY up.role) perfis,
         GROUP_CONCAT(DISTINCT s.name ORDER BY s.name) setores
  FROM usuarios u
  LEFT JOIN usuarios_perfis up ON up.userId = u.id
  LEFT JOIN usuarios_setores us ON us.userId = u.id
  LEFT JOIN setores s ON s.id = us.sectorId
  GROUP BY u.id ORDER BY u.createdAt`)

const jobs = await q(`
  SELECT legacyOrderNumber pedido, status, errorCode erro, attemptCount tentativas,
         createdAt solicitado, completedAt concluido
  FROM jobs_integracao ORDER BY createdAt DESC LIMIT 8`)

const mapeamentos = await q(`
  SELECT m.legacyCategory categoria, s.name setor, m.status
  FROM mapeamentos_categoria_setor m JOIN setores s ON s.id = m.sectorId
  ORDER BY m.legacyCategory`)

// ------------------------------------------------------------------ helpers
const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

function qtd(v) {
  if (v === null || v === undefined) return '—'
  const n = Number(v)
  return Number.isFinite(n) ? n.toLocaleString('pt-BR', { maximumFractionDigits: 3 }) : esc(v)
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

function tabela(cabecalhos, linhas, classes = '') {
  return `<table class="${classes}"><thead><tr>${cabecalhos
    .map((h) => `<th>${esc(h)}</th>`)
    .join('')}</tr></thead><tbody>${linhas
    .map((l) => `<tr>${l.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`
}

function blocoEstrutura(nomeTabela) {
  const { colunas, fks, indices } = estrutura[nomeTabela]
  const mapaFk = new Map(fks.map((f) => [f.coluna, f]))
  return `<div class="tabela-estrutura">
    <h3>${esc(nomeTabela)} <span class="contagem">${contagens[nomeTabela]} registros</span></h3>
    ${tabela(
      ['Coluna', 'Tipo', 'Nulo', 'Chave', 'Referência'],
      colunas.map((c) => {
        const fk = mapaFk.get(c.nome)
        const chave = c.chave === 'PRI' ? 'PK' : c.chave === 'UNI' ? 'UNIQUE' : c.chave === 'MUL' ? 'INDEX' : '—'
        return [
          `<code>${esc(c.nome)}</code>${c.extra ? ` <span class="tag">${esc(c.extra)}</span>` : ''}`,
          esc(c.tipo),
          c.nulo === 'YES' ? 'sim' : 'não',
          chave,
          fk ? `<code>${esc(fk.referencia)}.${esc(fk.colunaRef)}</code>` : '—',
        ]
      }),
    )}
    <p class="indices">Índices: ${indices
      .map((i) => `<code>${esc(i.nome)}(${esc(i.colunas)})</code>`)
      .join(' · ')}</p>
  </div>`
}

function blocoAmostra(nomeTabela, colunas) {
  const linhas = amostras[nomeTabela] ?? []
  if (linhas.length === 0) return `<p class="vazio">Sem registros em ${esc(nomeTabela)}.</p>`
  return tabela(
    colunas,
    linhas.map((linha) =>
      colunas.map((coluna) => {
        const valor = linha[coluna]
        if (valor === null || valor === undefined) return '—'
        if (valor instanceof Date) return data(valor)
        if (typeof valor === 'object') return qtd(valor)
        if (/^(requestedQuantity|quantity|disponivel|solicitado|executado|entregue)$/.test(coluna)) {
          return qtd(valor)
        }
        if (/At$|deadlineAt|scheduledAt|confirmedAt|occurredAt|createdAt|completedAt/.test(coluna)) {
          return data(valor)
        }
        return esc(valor)
      }),
    ),
  )
}

const css = `
  :root { --paper:#f5f7fa; --ink:#0f172a; --muted:#5b6b7a; --line:#d7e0e7; --accent:#0e7490; --blue:#1d4ed8; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--paper); color:var(--ink); font-family:"Segoe UI", Arial, sans-serif; }
  .wrap { max-width:1560px; margin:0 auto; padding:44px 40px 220px; }
  header.hero { padding:44px; border-radius:20px; background:linear-gradient(135deg,#0b1b2b,#155e75); color:#fff; }
  header.hero h1 { margin:10px 0 8px; font-size:48px; line-height:1.1; }
  header.hero p { margin:0; color:#bae6fd; font-size:22px; line-height:1.45; }
  .kicker { color:#67e8f9; font-size:15px; letter-spacing:.14em; text-transform:uppercase; font-weight:700; }
  section { margin-top:34px; padding:30px; background:#fff; border:1px solid var(--line); border-radius:16px; }
  h2 { margin:0 0 8px; font-size:32px; }
  p.sub { margin:0 0 20px; color:var(--muted); font-size:19px; }
  h3 { margin:26px 0 10px; font-size:22px; }
  .contagem { font-size:14px; color:var(--muted); font-weight: 500; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:18px; }
  .card { padding:18px; border:1px solid var(--line); border-radius:12px; background:#f8fafc; }
  .card strong { display:block; font-size:18px; margin-bottom:6px; }
  .card span { color:var(--muted); font-size:16px; line-height:1.4; }
  .num { font-size:40px; font-weight:800; color:var(--accent); }
  table { width:100%; border-collapse:collapse; font-size:16px; margin-top:8px; }
  th { text-align:left; padding:10px; background:#eef4f7; border-bottom:2px solid var(--line); color:#334155; font-size:13px; text-transform:uppercase; letter-spacing:.04em; }
  td { padding:10px; border-bottom:1px solid #e6edf1; vertical-align:top; }
  tr:nth-child(even) td { background:#fbfdfe; }
  code { font-family:Consolas, "Cascadia Mono", monospace; font-size:15px; }
  pre { margin:10px 0 0; padding:18px; background:#0b1b2b; color:#e2e8f0; border-radius:12px; font-size:16px; line-height:1.5; overflow:auto; }
  .nota { padding:16px 18px; border-left:5px solid var(--accent); background:#ecfeff; border-radius:10px; color:#155e75; font-size:17px; line-height:1.45; }
  .alerta { border-left-color:#b45309; background:#fffbeb; color:#92400e; }
  .shot { width:100%; border:1px solid var(--line); border-radius:12px; }
  .tag { font-size:11px; background:#e0f2fe; color:#075985; border-radius:999px; padding:2px 7px; margin-left:4px; }
  .vazio { color:var(--muted); font-size:16px; }
  .indices { color:var(--muted); font-size:14px; margin:8px 0 0; }
  .tabela-estrutura { margin-top:22px; }
  .mapa { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
  .mapa b { padding:8px 12px; border:1px solid #94a3b8; border-radius:9px; background:#fff; font-size:17px; }
  .mapa i { color:#64748b; font-style:normal; }
`

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Capítulo de banco — 3E Operações</title>
<style>${css}</style></head>
<body><div class="wrap">

<header class="hero" id="capa">
  <div class="kicker">3E Operações · capítulo de banco de dados</div>
  <h1>Onde a operação vira dado</h1>
  <p>Banco <b>${esc(banco)}</b> (MySQL 8.4) com ${tabelas.length} tabelas. Estrutura, relacionamentos, registros da demonstração e as consultas que ligam cada tela ao banco.</p>
</header>

<section id="dbeaver">
  <h2>1. DBeaver e o banco do sistema</h2>
  <p class="sub">O DBeaver está instalado no ambiente e tem duas conexões: o Top Gerente (somente leitura) e o MySQL do aplicativo.</p>
  <div class="grid2">
    <div>
      <img class="shot" src="../dbeaver-test.png" alt="Janela do DBeaver com as conexões topgerente e localhost">
      <p class="indices">Captura real da janela do DBeaver usada no ambiente.</p>
    </div>
    <div>
      <div class="nota"><b>topgerente</b>: pedidos, itens, clientes e vendedores do ERP. O conector local faz apenas <code>SELECT</code>.</div>
      <div class="nota" style="margin-top:12px;border-color:#1d4ed8;background:#eff6ff;color:#1e3a8a"><b>${esc(banco)}</b>: banco isolado de demonstração. É aqui que o aplicativo lê e grava.</div>
      <div class="nota alerta" style="margin-top:12px"><b>Limitação desta gravação</b>: nesta sessão o DBeaver apresentou texto invisível na árvore e no editor (defeito de renderização do ambiente). As consultas abaixo foram executadas de fato no MySQL e os resultados são reais; a captura acima registra a janela do DBeaver.</div>
    </div>
  </div>
</section>

<section id="inventario">
  <h2>2. Inventário do banco</h2>
  <p class="sub">Volume atual por tabela, no banco de demonstração.</p>
  <div class="grid3">
    ${['pedidos', 'pedidos_itens', 'atividades', 'execucoes', 'ocorrencias', 'entregas', 'remessas_programadas', 'logs_auditoria', 'usuarios']
      .map(
        (t) => `<div class="card"><strong>${esc(t)}</strong><span class="num">${qtd(contagens[t])}</span><span>registros</span></div>`,
      )
      .join('')}
  </div>
  <div class="mapa">
    <b>pedidos</b><i>→</i><b>pedidos_itens</b><i>→</i><b>atividades</b><i>→</i><b>execucoes</b>
    <i>·</i><b>ocorrencias</b><i>·</i><b>entregas</b><i>·</i><b>remessas_programadas</b><i>·</i><b>logs_auditoria</b>
  </div>
</section>

<section id="pedidos">
  <h2>3. Pedidos e previsão</h2>
  <p class="sub">A lista de pedidos lê <code>pedidos</code> e agrega <code>pedidos_itens</code>. A previsão é o maior prazo entre os itens.</p>
  <pre>SELECT p.legacyNumber, p.customerName, COUNT(i.id) AS itens,
       MAX(i.deadlineAt) AS previsao,
       SUM(i.classificationStatus = 'PENDING_CLASSIFICATION') AS pendentes
FROM pedidos p LEFT JOIN pedidos_itens i ON i.orderId = p.id
GROUP BY p.id ORDER BY p.createdAt DESC;</pre>
  ${tabela(
    ['Pedido', 'Cliente', 'Itens', 'Previsão', 'Pendentes'],
    pedidos.map((p) => [esc(p.pedido), esc(p.cliente), qtd(p.itens), dia(p.previsao), qtd(p.pendentes)]),
  )}
</section>

<section id="saldos">
  <h2>4. Itens, execução e entrega</h2>
  <p class="sub">O saldo exibido na tela vem de três tabelas: itens (solicitado), execuções (produzido) e entregas (entregue). O pedido 82268 é usado como amostra.</p>
  <pre>SELECT i.description, i.requestedQuantity,
       COALESCE(SUM(e.quantity),0) AS executado,
       COALESCE(SUM(d.quantity),0) AS entregue
FROM pedidos_itens i
LEFT JOIN atividades a ON a.orderItemId = i.id
LEFT JOIN execucoes e ON e.activityId = a.id
LEFT JOIN entregas d ON d.orderItemId = i.id
WHERE i.orderId = ? GROUP BY i.id;</pre>
  ${tabela(
    ['Pedido', 'Item', 'Un.', 'Solicitado', 'Executado', 'Entregue', 'Prazo'],
    saldos.map((s) => [
      esc(s.pedido),
      esc(s.item),
      esc(s.unidade),
      qtd(s.solicitado),
      qtd(s.executado),
      qtd(s.entregue),
      dia(s.prazo),
    ]),
  )}
  <p class="indices">Observação: a soma acima é ilustrativa por item; a aplicação calcula o saldo por atividade e unidade, sem somar unidades diferentes.</p>
</section>

<section id="atividades">
  <h2>5. Atividades e fila de produção</h2>
  <p class="sub">Cada item desmembrado gera uma atividade no setor. A fila do Operador filtra por setor e mostra prioridade e status.</p>
  ${tabela(
    ['Setor', 'Status', 'Prioridade', 'Pedido', 'Item', 'Un.', 'Solicitado'],
    atividades.map((a) => [
      esc(a.setor),
      esc(a.status),
      qtd(a.prioridade),
      esc(a.pedido),
      esc(a.item),
      esc(a.unidade),
      qtd(a.solicitado),
    ]),
  )}
</section>

<section id="execucoes">
  <h2>6. Execuções</h2>
  <p class="sub">Cada apontamento do Operador grava usuário, quantidade e data/hora. O saldo e o status da atividade são recalculados.</p>
  ${tabela(
    ['Usuário', 'Quantidade', 'Un.', 'Pedido', 'Item', 'Quando'],
    execucoes.map((e) => [esc(e.usuario), qtd(e.quantidade), esc(e.unidade), esc(e.pedido), esc(e.item), data(e.quando)]),
  )}
</section>

<section id="ocorrencias">
  <h2>7. Ocorrências</h2>
  <p class="sub">Perdas, refugos, indisponibilidades, pausas e paradas ficam vinculados à atividade, ao motivo e ao responsável.</p>
  ${tabela(
    ['Tipo', 'Quantidade', 'Duração', 'Motivo', 'Responsável', 'Pedido', 'Setor', 'Quando'],
    ocorrencias.map((o) => [
      esc(o.tipo),
      o.quantidade === null ? '—' : qtd(o.quantidade),
      o.duracao === null ? '—' : `${qtd(o.duracao)} min`,
      esc(o.motivo ?? '—'),
      esc(o.responsavel),
      esc(o.pedido),
      esc(o.setor),
      data(o.quando),
    ]),
  )}
</section>

<section id="entregas">
  <h2>8. Entregas e remessas</h2>
  <p class="sub">A entrega baixa o disponível; a remessa é apenas uma previsão e não altera saldo.</p>
  <h3>Entregas registradas</h3>
  ${tabela(
    ['Pedido', 'Item', 'Quantidade', 'Un.', 'Responsável', 'Exceção', 'Quando'],
    entregas.map((e) => [
      esc(e.pedido),
      esc(e.item),
      qtd(e.quantidade),
      esc(e.unidade),
      esc(e.responsavel),
      e.excecao ? 'sim' : 'não',
      data(e.quando),
    ]),
  )}
  <h3>Remessas programadas</h3>
  ${tabela(
    ['Pedido', 'Item', 'Número', 'Prevista', 'Confirmada'],
    remessas.map((r) => [esc(r.pedido), esc(r.item), `${r.numero}ª`, dia(r.prevista), r.confirmada ? data(r.confirmada) : '—']),
  )}
</section>

<section id="auditoria">
  <h2>9. Auditoria</h2>
  <p class="sub">A alteração de prazo grava antes e depois em <code>logs_auditoria</code>. É o que alimenta o histórico na tela do pedido.</p>
  <pre>SELECT action, entityType, beforeJson, afterJson, reason, userId, createdAt
FROM logs_auditoria ORDER BY createdAt DESC LIMIT 12;</pre>
  ${tabela(
    ['Ação', 'Entidade', 'Antes', 'Depois', 'Motivo', 'Quando'],
    auditoria.map((a) => [
      esc(a.acao),
      esc(a.entidade),
      `<code>${esc(JSON.stringify(a.antes))}</code>`,
      `<code>${esc(JSON.stringify(a.depois))}</code>`,
      esc(a.motivo ?? '—'),
      data(a.quando),
    ]),
  )}
</section>

<section id="usuarios">
  <h2>10. Usuários, perfis e setores</h2>
  <p class="sub">A autenticação lê <code>usuarios</code>; a autorização usa <code>usuarios_perfis</code> e <code>usuarios_setores</code>.</p>
  ${tabela(
    ['Nome', 'E-mail', 'Situação', 'Perfis', 'Setores'],
    usuarios.map((u) => [esc(u.nome), esc(u.email), esc(u.status), esc(u.perfis ?? '—'), esc(u.setores ?? '—')]),
  )}
  <p class="indices">Senhas são armazenadas como hash scrypt; nenhuma senha em texto é exibida.</p>
</section>

<section id="integracao">
  <h2>11. Integração e mapeamentos</h2>
  <p class="sub">Os jobs registram cada tentativa de importação; os mapeamentos ligam a categoria do legado ao setor.</p>
  ${tabela(
    ['Pedido', 'Status', 'Erro', 'Tentativas', 'Solicitado', 'Concluído'],
    jobs.map((j) => [
      esc(j.pedido),
      esc(j.status),
      esc(j.erro ?? '—'),
      qtd(j.tentativas),
      data(j.solicitado),
      j.concluido ? data(j.concluido) : '—',
    ]),
  )}
  ${tabela(
    ['Categoria do legado', 'Setor', 'Situação'],
    mapeamentos.map((m) => [esc(m.categoria), esc(m.setor), esc(m.status)]),
  )}
</section>

<section id="estrutura">
  <h2>12. Estrutura das tabelas</h2>
  <p class="sub">Colunas, tipos, chaves primárias, estrangeiras e índices — lidos de <code>information_schema</code>.</p>
  ${tabelas.map(blocoEstrutura).join('')}
</section>

<section id="amostras">
  <h2>13. Amostras de registros</h2>
  <p class="sub">Primeiras linhas de cada tabela, com dados de demonstração.</p>
  ${tabelas
    .map((t) => {
      const colunas = estrutura[t].colunas.slice(0, 7).map((c) => c.nome)
      return `<h3>${esc(t)}</h3>${blocoAmostra(t, colunas)}`
    })
    .join('')}
</section>

<section id="mapa-telas">
  <h2>14. Da tela para a tabela</h2>
  <div class="grid2">
    <div class="card"><strong>Lista e detalhe de pedidos</strong><span><code>pedidos</code>, <code>pedidos_itens</code>, <code>atividades</code>, <code>execucoes</code>, <code>entregas</code> — número, cliente, itens, previsão e saldos.</span></div>
    <div class="card"><strong>Prazos e histórico</strong><span><code>pedidos_itens.deadlineAt</code> e <code>logs_auditoria</code> (<code>DEADLINE_CHANGED</code>) com antes/depois, usuário e data.</span></div>
    <div class="card"><strong>Fila e execução</strong><span><code>atividades</code> (setor, status, prioridade) e <code>execucoes</code> (usuário, quantidade, data).</span></div>
    <div class="card"><strong>Ocorrências</strong><span><code>ocorrencias</code> + <code>motivos_ocorrencia</code>, ligadas à atividade e ao usuário.</span></div>
    <div class="card"><strong>Entregas</strong><span><code>entregas</code> (quantidade, exceção, autorizador, disponível antes) e <code>remessas_programadas</code>.</span></div>
    <div class="card"><strong>Administração</strong><span><code>usuarios</code>, <code>usuarios_perfis</code>, <code>usuarios_setores</code>, <code>setores</code> e <code>mapeamentos_categoria_setor</code>.</span></div>
    <div class="card"><strong>Integração</strong><span><code>jobs_integracao</code> e <code>eventos_job_integracao</code>; o pedido importado vai para <code>pedidos</code>.</span></div>
    <div class="card"><strong>Auditoria</strong><span><code>logs_auditoria</code> registra prazos, correções de setor, exceções de entrega e solicitações de importação.</span></div>
  </div>
</section>

<section id="fim">
  <h2>15. Conclusão</h2>
  <p class="sub">O banco guarda o ciclo completo: pedido → item → atividade → execução/ocorrência → entrega, com usuários, permissões e auditoria. As consultas acima foram executadas no banco de demonstração e conferem com os registros criados na interface.</p>
  <div class="nota">Dados de clientes foram anonimizados para a gravação. Nenhuma senha, token ou credencial é exibida.</div>
</section>

</div></body></html>`

const destino = path.join('docs', 'video-demo-2026-10-29', 'banco', 'capitulo-banco.html')
fs.mkdirSync(path.dirname(destino), { recursive: true })
fs.writeFileSync(destino, html, 'utf8')
console.log('HTML gerado:', destino)
console.log('tabelas:', tabelas.length, '| pedidos:', pedidos.length, '| atividades:', atividades.length)
await conexao.end()
