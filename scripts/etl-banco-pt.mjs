// ETL de migração do schema antigo para o schema novo (14 tabelas, nomes em PT).
// Uso:
//   ORIGEM_URL="mysql://..." DESTINO_URL="mysql://..." node scripts/etl-banco-pt.mjs
// Sem variáveis, usa o DATABASE_URL do .env como origem e o mesmo banco com sufixo _v2.
import fs from 'node:fs'
import mysql from 'mysql2/promise'

function lerEnv(caminho) {
  const env = {}
  for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

function conectar(urlStr) {
  const url = new URL(urlStr)
  return mysql.createConnection({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    multipleStatements: false,
  })
}

const env = lerEnv('.env')
const origemUrl = process.env.ORIGEM_URL ?? env.DATABASE_URL
const destinoUrl = process.env.DESTINO_URL ?? origemUrl.replace(/\/[^/]+$/, `/${new URL(origemUrl).pathname.split('/').pop()}_v2`)
const origem = await conectar(origemUrl)
const destino = await conectar(destinoUrl)

const q = async (conexao, sql, params = []) => (await conexao.query(sql, params))[0]
const inserir = async (tabela, colunas, valores) => {
  if (valores.length === 0) return 0
  const placeholders = colunas.map(() => '?').join(', ')
  const sql = `INSERT INTO \`${tabela}\` (${colunas.map((c) => `\`${c}\``).join(', ')}) VALUES (${placeholders})`
  for (const linha of valores) await destino.query(sql, linha)
  return valores.length
}
const data = (v) => (v ? new Date(v) : null)
const json = (v) => (v === null || v === undefined ? null : JSON.stringify(v))

console.log('ETL iniciado')

// ---------------------------------------------------------------- cadastros
const setores = await q(origem, 'SELECT * FROM setores')
console.log('setores', await inserir('setores', ['id', 'codigo', 'nome', 'ativo', 'criado_em', 'atualizado_em'], setores.map((r) => [r.id, r.code, r.name, r.active ? 1 : 0, r.createdAt, r.updatedAt])))

const usuarios = await q(origem, 'SELECT * FROM usuarios')
console.log('usuarios', await inserir('usuarios', ['id', 'nome', 'email', 'senha_hash', 'situacao', 'criado_em', 'atualizado_em'], usuarios.map((r) => [r.id, r.name, r.email, r.passwordHash, r.status, r.createdAt, r.updatedAt])))

const perfis = await q(origem, 'SELECT * FROM usuarios_perfis')
console.log('usuarios_perfis', await inserir('usuarios_perfis', ['usuario_id', 'perfil'], perfis.map((r) => [r.userId, r.role])))

const setoresUsuarios = await q(origem, 'SELECT * FROM usuarios_setores')
console.log('usuarios_setores', await inserir('usuarios_setores', ['usuario_id', 'setor_id'], setoresUsuarios.map((r) => [r.userId, r.sectorId])))

const motivos = await q(origem, 'SELECT * FROM motivos_ocorrencia')
console.log('motivos', await inserir('motivos_ocorrencia', ['id', 'tipo', 'codigo', 'descricao', 'ativo', 'criado_em', 'atualizado_em'], motivos.map((r) => [r.id, r.tipo, r.codigo, r.descricao, r.ativo ? 1 : 0, r.createdAt, r.updatedAt])))

// ---------------------------------------------------------------- comercial
const pedidos = await q(origem, 'SELECT * FROM pedidos')
console.log('pedidos', await inserir('pedidos', ['id', 'chave_legado', 'numero_legado', 'cliente_nome', 'vendedor_codigo', 'data_origem', 'sincronizado_em', 'criado_em', 'atualizado_em'], pedidos.map((r) => [r.id, r.legacyOrderKey, r.legacyNumber, r.customerName, r.sellerLegacyCode, data(r.sourceUpdatedAt), data(r.lastSyncedAt), r.createdAt, r.updatedAt])))

// Atividades por item (1:1). O ETL falha se houver mais de uma por item.
const atividades = await q(origem, 'SELECT * FROM atividades')
const atividadePorItem = new Map()
for (const a of atividades) {
  if (atividadePorItem.has(a.orderItemId)) {
    throw new Error(`Item ${a.orderItemId} possui mais de uma atividade; revise antes de migrar.`)
  }
  atividadePorItem.set(a.orderItemId, a)
}
const itens = await q(origem, 'SELECT * FROM pedidos_itens')
const linhasItens = itens.map((r) => {
  const a = atividadePorItem.get(r.id)
  return [
    r.id, r.orderId, r.legacyItemKey, r.productCode, r.description, r.legacyCategory, r.unit,
    r.requestedQuantity, data(r.deadlineAt), a?.sectorId ?? null, a?.status ?? 'PENDING',
    a?.priority ?? 0, data(a?.deadlineAt), data(a?.createdAt), null, r.createdAt, r.updatedAt,
  ]
})
console.log('pedidos_itens', await inserir('pedidos_itens', [
  'id', 'pedido_id', 'chave_item_legado', 'codigo_produto', 'descricao', 'categoria_legado',
  'unidade', 'quantidade_solicitada', 'prazo_entrega', 'setor_id', 'situacao', 'prioridade',
  'prazo_operacional', 'classificado_em', 'classificado_por', 'criado_em', 'atualizado_em',
], linhasItens))

// ---------------------------------------------------------------- operação
const execucoes = await q(origem, 'SELECT * FROM execucoes')
console.log('apontamentos', await inserir('apontamentos', [
  'id', 'item_id', 'usuario_id', 'quantidade', 'registrado_em', 'iniciado_em', 'finalizado_em',
  'observacao', 'situacao', 'chave_idempotencia', 'anulado_em', 'anulado_por', 'motivo_anulacao', 'criado_em',
], execucoes.map((r) => {
  const a = atividades.find((x) => x.id === r.activityId)
  if (!a) throw new Error(`Execução ${r.id} sem atividade ${r.activityId}`)
  return [r.id, a.orderItemId, r.userId, r.quantity, r.occurredAt, null, r.occurredAt, null, 'CONCLUIDO', `legado:execucao:${r.id}`, null, null, null, r.occurredAt]
})))

const ocorrencias = await q(origem, 'SELECT * FROM ocorrencias')
console.log('ocorrencias', await inserir('ocorrencias', [
  'id', 'item_id', 'usuario_id', 'tipo', 'quantidade', 'duracao_minutos', 'motivo_id', 'observacao',
  'ocorrido_em', 'apontamento_id', 'chave_idempotencia', 'anulado_em', 'anulado_por', 'motivo_anulacao', 'criado_em',
], ocorrencias.map((r) => {
  const a = atividades.find((x) => x.id === r.activityId)
  if (!a) throw new Error(`Ocorrência ${r.id} sem atividade ${r.activityId}`)
  return [r.id, a.orderItemId, r.userId, r.type, r.quantity, r.durationMin, r.motivoId, r.note, r.occurredAt, null, `legado:ocorrencia:${r.id}`, null, null, null, r.occurredAt]
})))

const entregas = await q(origem, 'SELECT * FROM entregas')
console.log('entregas', await inserir('entregas', [
  'id', 'item_id', 'usuario_id', 'quantidade', 'excecao_autorizada', 'motivo_excecao', 'autorizado_por',
  'disponivel_antes', 'entregue_em', 'chave_idempotencia', 'anulado_em', 'anulado_por', 'motivo_anulacao', 'criado_em',
], entregas.map((r) => [r.id, r.orderItemId, r.userId, r.quantity, r.managerOverride ? 1 : 0, r.overrideReason, r.authorizedByUserId, r.availableBefore, r.occurredAt, `legado:entrega:${r.id}`, null, null, null, r.occurredAt])))

const remessas = await q(origem, 'SELECT * FROM remessas_programadas')
console.log('entregas_previstas', await inserir('entregas_previstas', [
  'id', 'item_id', 'numero_remessa', 'data_prevista', 'quantidade_prevista', 'confirmada_em', 'confirmada_por',
  'criado_por', 'observacao', 'anulada_em', 'anulada_por', 'motivo_anulacao', 'criado_em', 'atualizado_em',
], remessas.map((r) => [r.id, r.orderItemId, r.remessa, r.scheduledAt, null, data(r.confirmedAt), null, null, r.note, null, null, null, r.createdAt, r.updatedAt])))

// ---------------------------------------------------------------- integração
const jobs = await q(origem, 'SELECT * FROM jobs_integracao')
const pedidoPorId = new Map(pedidos.map((p) => [p.id, p]))
const auditoriaImport = await q(origem, "SELECT correlationId, userId FROM logs_auditoria WHERE action='IMPORT_REQUESTED'")
const solicitantePorChave = new Map(auditoriaImport.map((a) => [a.correlationId, a.userId]))
console.log('jobs_integracao', await inserir('jobs_integracao', [
  'id', 'pedido_id', 'numero_legado', 'empresa_origem', 'chave_idempotencia', 'situacao', 'tentativas',
  'erro_codigo', 'erro_mensagem', 'solicitado_por', 'criado_em', 'atualizado_em', 'despachado_em', 'concluido_em',
], jobs.map((r) => {
  const pedido = r.orderId ? pedidoPorId.get(r.orderId) : null
  const empresa = pedido?.legacyOrderKey?.split(':')[0] ?? '1'
  return [r.id, r.orderId, r.legacyOrderNumber, empresa, r.idempotencyKey, r.status, r.attemptCount, r.errorCode, r.errorMessage, solicitantePorChave.get(r.idempotencyKey) ?? null, r.createdAt, r.updatedAt, null, data(r.completedAt)]
})))

// Eventos de job passam a ser auditoria (a view vw_eventos_job_integracao preserva a leitura).
const eventos = await q(origem, 'SELECT * FROM eventos_job_integracao ORDER BY createdAt')
console.log('eventos migrados para logs_auditoria', await inserir('logs_auditoria', [
  'id', 'usuario_id', 'acao', 'entidade_tipo', 'entidade_id', 'antes_json', 'depois_json', 'motivo', 'correlacao_id', 'criado_em',
], eventos.map((r) => [`evt_${r.id}`, null, r.type, 'JobIntegracao', r.jobId, null, JSON.stringify({ detalhe: r.detail }), null, null, r.createdAt])))

const auditorias = await q(origem, 'SELECT * FROM logs_auditoria')
console.log('logs_auditoria', await inserir('logs_auditoria', [
  'id', 'usuario_id', 'acao', 'entidade_tipo', 'entidade_id', 'antes_json', 'depois_json', 'motivo', 'correlacao_id', 'criado_em',
], auditorias.map((r) => [r.id, r.userId, r.action, r.entityType, r.entityId, json(r.beforeJson), json(r.afterJson), r.reason, r.correlationId, r.createdAt])))

// ---------------------------------------------------------------- classificação
const categorias = await q(origem, 'SELECT * FROM mapeamentos_categoria_setor')
console.log('regras (categoria)', await inserir('regras_classificacao', [
  'id', 'tipo_correspondencia', 'operador', 'valor', 'setor_id', 'prioridade', 'ativo', 'vigente_de', 'vigente_ate', 'criado_em', 'atualizado_em',
], categorias.map((r) => [`cat_${r.id}`, 'CATEGORIA', 'IGUAL', r.legacyCategory, r.sectorId, 0, r.status === 'ACTIVE' ? 1 : 0, null, null, r.createdAt, r.updatedAt])))

const regras = await q(origem, 'SELECT * FROM regras_produto_setor')
const linhasRegras = []
for (const r of regras) {
  const operador = r.matchType === 'PREFIX' ? 'PREFIXO' : 'CONTEM'
  linhasRegras.push([`pc_${r.id}`, 'CODIGO_PRODUTO', operador, r.matchValue, r.sectorId, r.priority, r.active ? 1 : 0, null, null, r.createdAt, r.updatedAt])
  linhasRegras.push([`pd_${r.id}`, 'DESCRICAO', operador, r.matchValue, r.sectorId, r.priority, r.active ? 1 : 0, null, null, r.createdAt, r.updatedAt])
}
console.log('regras (produto)', await inserir('regras_classificacao', [
  'id', 'tipo_correspondencia', 'operador', 'valor', 'setor_id', 'prioridade', 'ativo', 'vigente_de', 'vigente_ate', 'criado_em', 'atualizado_em',
], linhasRegras))

console.log('ETL concluido')
await origem.end()
await destino.end()
