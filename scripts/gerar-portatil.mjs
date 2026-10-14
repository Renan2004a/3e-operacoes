// Gera o pacote portátil Windows a partir do build standalone do Next.js.
//
// Uso:
//   npm run build            # gera .next/standalone
//   node scripts/gerar-portatil.mjs
//
// Saída: dist/3e-operacoes-portatil/  (depois comprima em .zip)
//
// O pacote NÃO inclui o .env (segredos). O usuário preenche "config.env".

import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync, statSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const raiz = process.cwd()
const standalone = join(raiz, '.next', 'standalone')
const estatico = join(raiz, '.next', 'static')
const publico = join(raiz, 'public')
const empacotamento = join(raiz, 'packaging', 'portable')

const dist = join(raiz, 'dist')
const destino = join(dist, '3e-operacoes-portatil')
const appDir = join(destino, 'app')
const runtimeDir = join(destino, 'runtime')

if (!existsSync(standalone)) {
  console.error('Falta .next/standalone. Rode "npm run build" primeiro.')
  process.exit(1)
}

console.log('Montando pacote portátil...')
rmSync(destino, { recursive: true, force: true })
mkdirSync(appDir, { recursive: true })
mkdirSync(runtimeDir, { recursive: true })

// 1) Servidor standalone -> app/  (exclui arquivos .env; dereferencia symlinks)
cpSync(standalone, appDir, {
  recursive: true,
  dereference: true,
  filter: (src) => !/(^|[\\/])\.env(\.|$)/.test(src),
})

// 2) Arquivos estáticos do Next
mkdirSync(join(appDir, '.next'), { recursive: true })
cpSync(estatico, join(appDir, '.next', 'static'), { recursive: true, dereference: true })

// 3) Pasta public (se existir)
if (existsSync(publico)) cpSync(publico, join(appDir, 'public'), { recursive: true })

// 4) Runtime Node embutido
copyFileSync(process.execPath, join(runtimeDir, 'node.exe'))

// 5) Launcher e arquivos de apoio
copyFileSync(join(empacotamento, 'run.mjs'), join(appDir, 'run.mjs'))
copyFileSync(join(empacotamento, 'Iniciar.bat'), join(destino, 'Iniciar.bat'))
copyFileSync(join(empacotamento, 'config.env.example'), join(destino, 'config.env.example'))
copyFileSync(join(empacotamento, 'LEIA-ME.txt'), join(destino, 'LEIA-ME.txt'))

const tamanhoMb = (dir) => {
  let total = 0
  const pilha = [dir]
  while (pilha.length) {
    const atual = pilha.pop()
    for (const entrada of readdirSync(atual, { withFileTypes: true })) {
      const caminho = join(atual, entrada.name)
      if (entrada.isDirectory()) pilha.push(caminho)
      else total += statSync(caminho).size
    }
  }
  return (total / 1024 / 1024).toFixed(1)
}

console.log(`Pacote gerado: ${destino}`)
console.log(`Tamanho aproximado: ${tamanhoMb(destino)} MB`)
console.log('Compacte com: Compress-Archive -Path dist\\3e-operacoes-portatil\\* -DestinationPath dist\\3e-operacoes-portatil.zip -Force')
