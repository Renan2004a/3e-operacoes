// Converte um documento Markdown em PDF, com estilo de documento.
//
// Uso:
//   node scripts/doc-para-pdf.mjs <entrada.md> <saida.pdf>
//
// Converte Markdown -> HTML com `marked` (via npx) e renderiza o HTML no
// Chromium (Playwright) imprimindo em A4. Requer Node e Playwright instalados.

import { spawnSync } from 'node:child_process'
import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join, resolve } from 'node:path'
import { chromium } from '@playwright/test'

const entrada = process.argv[2]
const saida = process.argv[3]
if (!entrada || !saida) {
  console.error('Uso: node scripts/doc-para-pdf.mjs <entrada.md> <saida.pdf>')
  process.exit(1)
}

const caminhoMd = resolve(entrada)
const caminhoPdf = resolve(saida)
const caminhoHtml = join(tmpdir(), `${basename(entrada)}.${Date.now()}.html`)

// 1) Markdown -> HTML
const comando = `npx -y marked@12 -i "${caminhoMd}" -o "${caminhoHtml}"`
const conv = spawnSync(comando, { stdio: 'inherit', shell: true })
if (conv.status !== 0) {
  console.error('Falha ao converter Markdown (marked).')
  process.exit(1)
}

// 2) HTML -> página estilizada
const corpo = readFileSync(caminhoHtml, 'utf8')
rmSync(caminhoHtml, { force: true })

const documento = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<style>
  :root { --ink: #1f2937; --muted: #4b5563; --line: #d1d5db; --accent: #0f766e; }
  * { box-sizing: border-box; }
  body { color: var(--ink); font: 15px/1.65 "Segoe UI", system-ui, -apple-system, sans-serif; margin: 0; }
  h1 { font-size: 26px; border-bottom: 2px solid var(--accent); padding-bottom: 8px; }
  h2 { font-size: 20px; margin-top: 28px; color: var(--accent); }
  h3 { font-size: 17px; margin-top: 20px; }
  p, li { color: var(--ink); }
  a { color: var(--accent); text-decoration: none; word-break: break-word; }
  code { background: #f3f4f6; padding: 1px 5px; border-radius: 4px; font-size: 13px; }
  pre { background: #f3f4f6; padding: 12px; border-radius: 8px; overflow: auto; }
  blockquote { border-left: 4px solid var(--accent); background: #f0fdfa; margin: 16px 0; padding: 8px 16px; color: var(--muted); }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 13px; }
  th, td { border: 1px solid var(--line); padding: 7px 9px; text-align: left; vertical-align: top; }
  th { background: #f0fdfa; }
  hr { border: none; border-top: 1px solid var(--line); margin: 26px 0; }
  h2, h3 { break-after: avoid; }
  table, pre, blockquote { break-inside: avoid; }
</style>
</head>
<body>${corpo}</body>
</html>`

const browser = await chromium.launch()
const page = await browser.newPage()
await page.setContent(documento, { waitUntil: 'load' })
await page.pdf({
  path: caminhoPdf,
  format: 'A4',
  printBackground: true,
  margin: { top: '20mm', bottom: '20mm', left: '18mm', right: '18mm' },
  displayHeaderFooter: true,
  headerTemplate: '<div></div>',
  footerTemplate:
    '<div style="width:100%;font-size:9px;color:#6b7280;text-align:center;padding:0 18mm;">3E Operações — página <span class="pageNumber"></span> de <span class="totalPages"></span></div>',
})
await browser.close()

console.log(`PDF gerado: ${caminhoPdf}`)
