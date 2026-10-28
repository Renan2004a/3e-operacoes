/**
 * Corrige textos do legado que chegaram com dupla codificação (UTF-8 lido como
 * latin1) e normaliza descrição/código ausentes. Idempotente.
 *
 * Uso:
 *   node scripts/corrigir-dados-legado.mjs           # simulação (não grava)
 *   node scripts/corrigir-dados-legado.mjs --aplicar # grava as correções
 *
 * Só deve ser executado com o conector parado, para não competir com uma
 * importação em andamento.
 */
import fs from 'node:fs'
import mysql from 'mysql2/promise'

const aplicar = process.argv.includes('--aplicar')

function lerEnv(caminho) {
  const env = {}
  for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

function corrigirTexto(valor) {
  if (typeof valor !== 'string' || !/[ÃÂ]/.test(valor)) return valor
  try {
    const convertido = Buffer.from(valor, 'latin1').toString('utf8')
    return convertido.includes('\uFFFD') ? valor : convertido
  } catch {
    return valor
  }
}

function normalizarDescricao(valor) {
  if (valor === null || valor === undefined) return null
  const texto = corrigirTexto(String(valor)).trim()
  if (texto === '' || texto === '.' || texto === '-' || texto === '--') return null
  return texto
}

function normalizarCodigo(valor) {
  if (valor === null || valor === undefined) return null
  const texto = String(valor).trim()
  if (texto === '' || texto === '0') return null
  return texto
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

const [pedidos] = await conexao.query(
  'SELECT id, legacyNumber, customerName, sellerName FROM pedidos',
)
const [itens] = await conexao.query(
  'SELECT id, description, productCode FROM pedidos_itens',
)

const ajustesPedidos = []
for (const pedido of pedidos) {
  const customerName = corrigirTexto(pedido.customerName)
  const sellerName = corrigirTexto(pedido.sellerName)
  if (customerName !== pedido.customerName || sellerName !== pedido.sellerName) {
    ajustesPedidos.push({ ...pedido, customerName, sellerName })
  }
}

const ajustesItens = []
for (const item of itens) {
  const description = normalizarDescricao(item.description)
  const productCode = normalizarCodigo(item.productCode)
  if (description !== item.description || productCode !== item.productCode) {
    ajustesItens.push({ ...item, description, productCode })
  }
}

console.log(`Pedidos a corrigir: ${ajustesPedidos.length}/${pedidos.length}`)
for (const pedido of ajustesPedidos.slice(0, 10)) {
  console.log(`  ${pedido.legacyNumber}: ${pedido.customerName ?? '—'} | ${pedido.sellerName ?? '—'}`)
}
console.log(`Itens a corrigir: ${ajustesItens.length}/${itens.length}`)
for (const item of ajustesItens.slice(0, 15)) {
  console.log(`  ${item.description ?? '—'} / código ${item.productCode ?? '—'}`)
}

if (!aplicar) {
  console.log('\nSimulação apenas. Rode com --aplicar para gravar.')
  await conexao.end()
  process.exit(0)
}

for (const pedido of ajustesPedidos) {
  await conexao.query('UPDATE pedidos SET customerName = ?, sellerName = ? WHERE id = ?', [
    pedido.customerName,
    pedido.sellerName,
    pedido.id,
  ])
}
for (const item of ajustesItens) {
  await conexao.query('UPDATE pedidos_itens SET description = ?, productCode = ? WHERE id = ?', [
    item.description,
    item.productCode,
    item.id,
  ])
}

console.log(
  `\nAplicado: ${ajustesPedidos.length} pedido(s) e ${ajustesItens.length} item(ns) corrigidos.`,
)
await conexao.end()
