// Grava o capítulo de banco a partir do HTML gerado com dados reais.
// Requer docs/video/capitulo-banco.html e docs/video/dbeaver-test.png.

import { chromium } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const DIR = join(process.cwd(), 'docs', 'video', 'tmp-demo')
mkdirSync(DIR, { recursive: true })
const html = join(process.cwd(), 'docs', 'video', 'capitulo-banco.html')

const navegador = await chromium.launch({ slowMo: 60 })
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'pt-BR',
  recordVideo: { dir: DIR, size: { width: 1280, height: 800 } },
})
const pagina = await contexto.newPage()
await pagina.goto(pathToFileURL(html).href, { waitUntil: 'domcontentloaded' })
await pagina.waitForTimeout(1000)

async function overlay(titulo, texto) {
  await pagina.evaluate(
    ({ titulo, texto }) => {
      let estilo = document.getElementById('demo-overlay-style')
      if (!estilo) {
        estilo = document.createElement('style')
        estilo.id = 'demo-overlay-style'
        estilo.textContent = `
          #demo-overlay { position: fixed; left: 24px; right: 24px; bottom: 24px; z-index: 2147483647;
            background: rgba(15,23,42,.95); color: #fff; border: 2px solid #67e8f9; border-radius: 14px;
            padding: 14px 20px; font-family: "Segoe UI", Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,.35); pointer-events: none; }
          #demo-overlay .kicker { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #67e8f9; font-weight: 700; }
          #demo-overlay .titulo { font-size: 18px; font-weight: 700; margin-top: 2px; }
          #demo-overlay .texto { font-size: 15px; line-height: 1.4; margin-top: 4px; color: #e5e7eb; }
        `
        document.head.appendChild(estilo)
      }
      let el = document.getElementById('demo-overlay')
      if (!el) {
        el = document.createElement('div')
        el.id = 'demo-overlay'
        document.body.appendChild(el)
      }
      el.innerHTML = `<div class="kicker">3E Operações · banco de dados</div><div class="titulo"></div><div class="texto"></div>`
      el.querySelector('.titulo').textContent = titulo
      el.querySelector('.texto').textContent = texto
    },
    { titulo, texto },
  )
}

async function narrar(secao, titulo, texto, ms = 6000) {
  if (secao) {
    await pagina.locator(`#${secao}`).scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(500)
  }
  await overlay(titulo, texto)
  await pagina.waitForTimeout(ms)
}

await narrar(
  null,
  'Capítulo de banco',
  'Agora o banco por dentro: o DBeaver, as duas conexões e as tabelas onde o app lê e grava. As consultas são reais e somente leitura.',
  7000,
)
await narrar(
  'dbeaver',
  'DBeaver · conexões',
  'No DBeaver, a conexão topgerente aponta para o ERP: pedidos, itens, clientes e vendedores. O app só lê. A conexão do app grava em 3e_operacoes.',
  8000,
)
await narrar(
  'mapa',
  'Mapa do dado',
  'O caminho é pedido → item → atividade → execução. A ocorrência também aponta para a atividade; a entrega e a previsão ficam no item.',
  7000,
)
await narrar(
  'contagens',
  'Volume atual',
  'Contagens reais: 7 pedidos, 60 itens, 14 atividades, 15 execuções, 13 ocorrências, 6 entregas e 3 remessas programadas.',
  7000,
)
await narrar(
  'pedido',
  'Pedido, item e atividade',
  'Cada linha mostra o número do pedido, o item, a unidade, a quantidade solicitada, a previsão, o status da atividade e o setor. É o que a lista e o detalhe exibem.',
  8000,
)
await narrar(
  'ocorrencias',
  'Ocorrências e entregas',
  'As ocorrências vêm do Operador e aparecem no painel do Gerente. As entregas vêm da Expedição. As remessas são as datas previstas.',
  7000,
)
await narrar(
  'auditoria',
  'Histórico de prazos',
  'A alteração de prazo grava uma linha em logs_auditoria com antes, depois e data/hora. Aqui estão as duas linhas da demonstração: 06/12 → 13/12 e a restauração.',
  9000,
)
await narrar(
  'fim',
  'Leitura e escrita',
  'Resumo: Top Gerente é somente leitura; o app grava em 3e_operacoes; a auditoria registra prazos e importações. Fim do capítulo de banco.',
  7000,
)

const caminho = await pagina.video()?.path()
await contexto.close()
await navegador.close()
if (caminho) {
  const destino = join(process.cwd(), 'docs', 'video', 'capitulo-banco.webm')
  copyFileSync(caminho, destino)
  console.log('Capítulo salvo em:', destino)
}
