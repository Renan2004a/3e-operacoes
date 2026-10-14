// Converte um arquivo HTML em PDF (para slides/apresentações).
//
// Uso:
//   node scripts/html-para-pdf.mjs <entrada.html> <saida.pdf> [largura] [altura]
//
// Ex.: slides 16:9 -> largura 1280, altura 720 (padrão).

import { chromium } from '@playwright/test'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const entrada = process.argv[2]
const saida = process.argv[3]
const largura = Number(process.argv[4] ?? 1280)
const altura = Number(process.argv[5] ?? 720)

if (!entrada || !saida) {
  console.error('Uso: node scripts/html-para-pdf.mjs <entrada.html> <saida.pdf> [largura] [altura]')
  process.exit(1)
}

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto(pathToFileURL(resolve(entrada)).href, { waitUntil: 'load' })
// aguarda carregamento de fontes web
await page.waitForTimeout(1500)
await page.pdf({
  path: resolve(saida),
  width: `${largura}px`,
  height: `${altura}px`,
  printBackground: true,
  margin: { top: '0', right: '0', bottom: '0', left: '0' },
})
await browser.close()
console.log(`PDF gerado: ${resolve(saida)}`)
