// Launcher do pacote portátil (ESM): lê "config.env" (ao lado da pasta app/) e
// inicia o servidor Next.js standalone como processo filho.
import fs from 'node:fs'
import path from 'node:path'
import { execFile, spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const appDir = path.dirname(fileURLToPath(import.meta.url))
const configPath = path.join(appDir, '..', 'config.env')

function carregarConfig(arquivo) {
  if (!fs.existsSync(arquivo)) {
    console.warn('Aviso: config.env nao encontrado; usando variaveis de ambiente do sistema.')
    return
  }
  const conteudo = fs.readFileSync(arquivo, 'utf8')
  for (const linha of conteudo.split(/\r?\n/)) {
    if (/^\s*#/.test(linha) || linha.trim() === '') continue
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/)
    if (!m) continue
    let valor = m[2].trim()
    if (
      (valor.startsWith('"') && valor.endsWith('"')) ||
      (valor.startsWith("'") && valor.endsWith("'"))
    ) {
      valor = valor.slice(1, -1)
    }
    if (valor !== '') process.env[m[1]] = valor
  }
}

carregarConfig(configPath)

process.env.NODE_ENV = 'production'
process.env.PORT = process.env.PORT || '3000'
const url = `http://localhost:${process.env.PORT}`

// Abre o navegador pouco depois de o servidor subir (pode ser desativado).
if (process.env.NAO_ABRIR_NAVEGADOR !== '1') {
  setTimeout(() => {
    execFile('cmd', ['/c', 'start', '', url], () => {})
  }, 3000)
}

console.log(`\n  3E Operacoes rodando em ${url}`)
console.log('  (Feche esta janela para encerrar)\n')

const filho = spawn(process.execPath, ['server.js'], {
  cwd: appDir,
  stdio: 'inherit',
  env: process.env,
})

filho.on('exit', (codigo) => process.exit(codigo ?? 0))
