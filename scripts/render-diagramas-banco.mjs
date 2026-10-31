// Renderiza os diagramas do banco (DER, MER e classes) em PNG usando Mermaid.
// Uso: node scripts/render-diagramas-banco.mjs
import { chromium } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const DIR = path.join(process.cwd(), 'docs', 'diagramas')

const diagramas = [
  {
    id: 'der',
    titulo: 'DER — Diagrama Entidade-Relacionamento',
    subtitulo:
      'Banco 3e_operacoes_v2 · 14 tabelas · chaves primárias, estrangeiras e relacionamentos físicos',
  },
  {
    id: 'mer',
    titulo: 'MER — Modelo Entidade-Relacionamento',
    subtitulo: 'Visão conceitual das entidades e das cardinalidades do domínio',
  },
  {
    id: 'classes',
    titulo: 'Diagrama de Classes — entidades do banco',
    subtitulo:
      'Classes de persistência · atributos correspondem às colunas · relacionamentos e multiplicidades',
  },
]

const navegador = await chromium.launch()
const pagina = await navegador.newPage({
  viewport: { width: 2200, height: 1500 },
  deviceScaleFactor: 2,
})

for (const diagrama of diagramas) {
  const mmd = fs.readFileSync(path.join(DIR, `${diagrama.id}-banco-pt-v2.mmd`), 'utf8')
  const mmdHtml = mmd.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8">
<style>
  * { box-sizing: border-box; }
  body { margin:0; background:#f6f8fb; color:#0f172a; font-family:"Segoe UI", Arial, sans-serif; }
  .wrap { width: max-content; min-width: 1500px; margin: 0 auto; padding: 30px 34px 46px; background:#f6f8fb; }
  header { margin-bottom: 18px; }
  h1 { margin: 0; font-size: 30px; line-height: 1.15; }
  p { margin: 6px 0 0; color:#5b6b7a; font-size: 16px; }
  .card { background:#fff; border:1px solid #d7e0e7; border-radius:16px; padding:20px; width:max-content; }
  .mermaid { display:block; overflow:visible; }
  .mermaid svg { max-width: none !important; }
</style></head>
<body><div class="wrap">
  <header><h1>${diagrama.titulo}</h1><p>${diagrama.subtitulo}</p></header>
  <div class="card"><div class="mermaid">${mmdHtml}</div></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<script>
  mermaid.initialize({
    startOnLoad: true,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: {
      fontFamily: 'Segoe UI, Arial, sans-serif',
      fontSize: '14px',
      primaryColor: '#eef6ff',
      primaryBorderColor: '#1d4ed8',
      primaryTextColor: '#0f172a',
      lineColor: '#475569',
      tertiaryColor: '#f8fafc'
    },
    er: { layoutDirection: 'TB', useMaxWidth: false },
    class: { useMaxWidth: false }
  })
</script></body></html>`

  await pagina.setContent(html, { waitUntil: 'networkidle' })
  await pagina.waitForSelector('.mermaid svg', { timeout: 30000 })
  await pagina.evaluate(() => {
    const svg = document.querySelector('.mermaid svg')
    if (!svg) return
    const vb = svg.viewBox.baseVal
    const largura = Math.ceil(vb.width)
    const altura = Math.ceil(vb.height)
    svg.setAttribute('width', String(largura))
    svg.setAttribute('height', String(altura))
    svg.style.maxWidth = 'none'
    svg.style.width = `${largura}px`
    svg.style.height = `${altura}px`
    const card = document.querySelector('.card')
    const wrap = document.querySelector('.wrap')
    if (card) {
      card.style.width = `${largura + 40}px`
      card.style.height = `${altura + 40}px`
    }
    if (wrap) {
      wrap.style.width = `${largura + 68}px`
      wrap.style.height = 'auto'
    }
  })
  await pagina.waitForTimeout(800)
  const destino = path.join(DIR, `${diagrama.id}-banco-pt-v2.png`)
  await pagina.locator('.wrap').screenshot({ path: destino })
  console.log('gerado:', destino)
}

await navegador.close()
