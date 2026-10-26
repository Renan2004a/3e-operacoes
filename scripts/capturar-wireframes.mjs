// Exporta os wireframes para PNG (um arquivo por moldura) e um PDF do board.
// Uso: node scripts/capturar-wireframes.mjs
// Entrada: docs/wireframes/index.html
// Saída:   docs/wireframes/png/*.png e docs/wireframes/wireframes.pdf

import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const raiz = process.cwd()
const html = join(raiz, 'docs', 'wireframes', 'index.html')
const saida = join(raiz, 'docs', 'wireframes', 'png')
const pdf = join(raiz, 'docs', 'wireframes', 'wireframes.pdf')
mkdirSync(saida, { recursive: true })

const navegador = await chromium.launch()
const pagina = await navegador.newPage({
  viewport: { width: 1480, height: 1000 },
  deviceScaleFactor: 2,
  locale: 'pt-BR',
})

await pagina.goto(pathToFileURL(html).href, { waitUntil: 'load' })
await pagina.evaluate(() => document.fonts?.ready)
await pagina.waitForTimeout(300)

// Durante a captura, remove a moldura fixa da galeria para ela não sobrepor
// as telas altas (o header sticky aparecia no meio do PNG).
const estiloCaptura = await pagina.addStyleTag({
  content: `
    .top, .side { display: none !important; }
    .layout { display: block !important; }
    .main { max-width: none !important; padding: 0 !important; }
    .tela { margin: 0 !important; border: 0 !important; padding: 0 !important; }
  `,
})

const medir = () =>
  pagina.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }))

const desktop = await medir()
const telas = await pagina.locator('[data-shot]').count()
console.log(`Desktop: ${desktop.scrollWidth}/${desktop.innerWidth} px · ${telas} molduras`)

const alvos = pagina.locator('[data-shot]')
const nomes = []
for (let indice = 0; indice < (await alvos.count()); indice += 1) {
  const alvo = alvos.nth(indice)
  const nome = await alvo.getAttribute('data-shot')
  if (!nome) continue
  if (nomes.includes(nome)) throw new Error(`data-shot duplicado: ${nome}`)
  nomes.push(nome)
  await alvo.scrollIntoViewIfNeeded()
  await alvo.screenshot({ path: join(saida, `${nome}.png`) })
  console.log(`PNG | ${nome}.png`)
}

// Volta ao layout normal para o PDF e o teste de responsividade da galeria.
await estiloCaptura.evaluate((elemento) => elemento.remove())

await pagina.pdf({
  path: pdf,
  format: 'A4',
  printBackground: true,
  margin: { top: '8mm', right: '8mm', bottom: '8mm', left: '8mm' },
})
console.log(`PDF | ${pdf}`)

await pagina.setViewportSize({ width: 390, height: 844 })
await pagina.reload({ waitUntil: 'load' })
await pagina.evaluate(() => document.fonts?.ready)
await pagina.waitForTimeout(300)
const mobile = await medir()
await pagina.screenshot({ path: join(saida, '_galeria-mobile.png') })
console.log(`Mobile: ${mobile.scrollWidth}/${mobile.innerWidth} px`)

await navegador.close()

const erros = []
if (desktop.scrollWidth > desktop.innerWidth + 1) {
  erros.push(`galeria desktop com rolagem horizontal (${desktop.scrollWidth} > ${desktop.innerWidth})`)
}
if (mobile.scrollWidth > mobile.innerWidth + 1) {
  erros.push(`galeria mobile com rolagem horizontal (${mobile.scrollWidth} > ${mobile.innerWidth})`)
}
if (telas < 20) erros.push(`poucas molduras exportadas: ${telas}`)

if (erros.length) {
  console.error('\nFalhas:')
  for (const erro of erros) console.error(`- ${erro}`)
  process.exitCode = 1
} else {
  console.log('\nResumo: wireframes exportados sem rolagem horizontal.')
}
