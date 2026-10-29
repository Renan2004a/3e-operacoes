// Framework de gravação da demonstração do 3E Operações.
// Playwright em 1920x1080 com cursor destacado, efeito de clique, foco,
// legendas queimadas, capítulos e transcrição para SRT.
import { chromium } from '@playwright/test'
import { copyFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const BASE = process.env.DEMO_BASE_URL ?? 'http://localhost:3000'
export const RAIZ = process.cwd()
export const DIR_VIDEO = join(RAIZ, 'docs', 'video-demo-2026-10-29')
export const DIR_TMP = join(DIR_VIDEO, 'tmp')

mkdirSync(DIR_TMP, { recursive: true })

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function iniciar(nome) {
  const navegador = await chromium.launch({ slowMo: 70 })
  const contexto = await navegador.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    recordVideo: { dir: DIR_TMP, size: { width: 1920, height: 1080 } },
  })
  const pagina = await contexto.newPage()

  const estado = {
    capitulo: 'Apresentação',
    titulo: '',
    texto: '',
    narracao: [],
    inicio: Date.now(),
  }

  await pagina.addInitScript(() => {
    function montar() {
      if (!document.body) return
      let estilo = document.getElementById('demo-estilo')
      if (!estilo) {
        estilo = document.createElement('style')
        estilo.id = 'demo-estilo'
        estilo.textContent = `
          * { cursor: none !important; }
          #demo-cursor { position: fixed; left: 0; top: 0; width: 28px; height: 28px;
            margin: -14px 0 0 -14px; border-radius: 999px; z-index: 2147483646;
            border: 3px solid #f59e0b; background: rgba(245,158,11,.18);
            box-shadow: 0 0 0 2px rgba(15,23,42,.55), 0 2px 6px rgba(0,0,0,.35);
            pointer-events: none; transition: transform 40ms linear; }
          #demo-cursor::after { content: ''; position: absolute; left: 50%; top: 50%;
            width: 6px; height: 6px; margin: -3px 0 0 -3px; border-radius: 999px;
            background: #f59e0b; box-shadow: 0 0 0 1px rgba(15,23,42,.6); }
          .demo-pulso { position: fixed; width: 28px; height: 28px; margin: -14px 0 0 -14px;
            border-radius: 999px; border: 3px solid #ef4444; z-index: 2147483645;
            pointer-events: none; animation: demo-pulso .55s ease-out forwards; }
          @keyframes demo-pulso { from { transform: scale(.8); opacity: .95; }
            to { transform: scale(2.6); opacity: 0; } }
          .demo-alvo { outline: 4px solid #22c55e !important; outline-offset: 2px !important;
            box-shadow: 0 0 0 6px rgba(34,197,94,.25) !important; border-radius: 8px !important;
            transition: outline-color .15s ease; }
          #demo-legenda { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%);
            width: min(1480px, calc(100vw - 60px)); z-index: 2147483647; pointer-events: none;
            background: rgba(10,20,30,.94); color: #f8fafc; border: 2px solid #38bdf8;
            border-radius: 14px; padding: 14px 22px; font-family: "Segoe UI", Arial, sans-serif;
            box-shadow: 0 12px 34px rgba(0,0,0,.45); }
          #demo-legenda .kicker { font-size: 13px; letter-spacing: .12em; text-transform: uppercase;
            color: #7dd3fc; font-weight: 700; }
          #demo-legenda .titulo { font-size: 24px; font-weight: 700; margin-top: 2px; }
          #demo-legenda .texto { font-size: 19px; line-height: 1.35; margin-top: 4px; color: #e2e8f0; }
          #demo-topo { position: fixed; right: 18px; top: 14px; z-index: 2147483647;
            background: rgba(10,20,30,.9); color: #bae6fd; border: 1px solid #0ea5e9;
            border-radius: 999px; padding: 6px 14px; font-family: "Segoe UI", Arial, sans-serif;
            font-size: 14px; font-weight: 700; pointer-events: none; }
          #demo-capitulo { position: fixed; inset: 0; z-index: 2147483647; display: grid;
            place-items: center; background: rgba(8,16,24,.94); color: #f8fafc;
            font-family: "Segoe UI", Arial, sans-serif; pointer-events: none;
            transition: opacity .5s ease; }
          #demo-capitulo .caixa { text-align: center; max-width: 1100px; padding: 40px; }
          #demo-capitulo .numero { font-size: 20px; letter-spacing: .18em; text-transform: uppercase;
            color: #7dd3fc; font-weight: 700; }
          #demo-capitulo .nome { font-size: 54px; font-weight: 800; margin-top: 10px; line-height: 1.1; }
          #demo-capitulo .sub { font-size: 24px; color: #cbd5e1; margin-top: 16px; line-height: 1.4; }
          #demo-capitulo .marca { font-size: 16px; color: #94a3b8; margin-top: 28px; letter-spacing: .08em; }
        `
        document.head.appendChild(estilo)
      }
      if (!document.getElementById('demo-cursor')) {
        const cursor = document.createElement('div')
        cursor.id = 'demo-cursor'
        document.body.appendChild(cursor)
      }
      if (!document.getElementById('demo-topo')) {
        const topo = document.createElement('div')
        topo.id = 'demo-topo'
        topo.textContent = '3E Operações · demonstração'
        document.body.appendChild(topo)
      }
      if (!document.getElementById('demo-legenda')) {
        const legenda = document.createElement('div')
        legenda.id = 'demo-legenda'
        document.body.appendChild(legenda)
      }
    }

    function mover(evento) {
      const cursor = document.getElementById('demo-cursor')
      if (cursor) cursor.style.transform = `translate(${evento.clientX}px, ${evento.clientY}px)`
    }

    function pulsar(evento) {
      const pulso = document.createElement('div')
      pulso.className = 'demo-pulso'
      pulso.style.left = `${evento.clientX}px`
      pulso.style.top = `${evento.clientY}px`
      document.body.appendChild(pulso)
      setTimeout(() => pulso.remove(), 600)
      const alvo = evento.target?.closest?.('button, a, input, select, textarea, [role="button"], td, li')
      if (alvo) {
        alvo.classList.add('demo-alvo')
        setTimeout(() => alvo.classList.remove('demo-alvo'), 900)
      }
    }

    montar()
    document.addEventListener('DOMContentLoaded', montar)
    document.addEventListener('mousemove', mover, true)
    document.addEventListener('mousedown', pulsar, true)
    window.__demoReaplicar = montar
  })

  const api = {
    navegador,
    contexto,
    pagina,
    estado,
    async reaplicar() {
      await pagina.evaluate(() => window.__demoReaplicar?.())
      await api.atualizarLegenda()
    },
    async atualizarLegenda() {
      await pagina
        .evaluate(
          ({ capitulo, titulo, texto }) => {
            const el = document.getElementById('demo-legenda')
            if (!el) return
            el.innerHTML =
              '<div class="kicker"></div><div class="titulo"></div><div class="texto"></div>'
            el.querySelector('.kicker').textContent = `3E Operações · ${capitulo}`
            el.querySelector('.titulo').textContent = titulo
            el.querySelector('.texto').textContent = texto
            const topo = document.getElementById('demo-topo')
            if (topo) topo.textContent = `3E Operações · ${capitulo}`
          },
          { capitulo: estado.capitulo, titulo: estado.titulo, texto: estado.texto },
        )
        .catch(() => undefined)
    },
    async narrar(titulo, texto, ms = 5200) {
      estado.titulo = titulo
      estado.texto = texto
      estado.narracao.push({
        segundo: Math.round((Date.now() - estado.inicio) / 1000),
        capitulo: estado.capitulo,
        titulo,
        texto,
      })
      await api.atualizarLegenda()
      await sleep(ms)
    },
    async capitulo(numero, nome, subtitulo, ms = 4200) {
      estado.capitulo = nome
      const segundos = Math.round((Date.now() - estado.inicio) / 1000)
      estado.narracao.push({ segundo: segundos, capitulo: nome, titulo: `Capítulo ${numero}`, texto: nome })
      await pagina
        .evaluate(
          ({ numero, nome, subtitulo }) => {
            let card = document.getElementById('demo-capitulo')
            if (!card) {
              card = document.createElement('div')
              card.id = 'demo-capitulo'
              document.body.appendChild(card)
            }
            card.style.opacity = '1'
            card.innerHTML = `<div class="caixa"><div class="numero">Capítulo ${numero}</div><div class="nome"></div><div class="sub"></div><div class="marca">3E Ferro e Aço · 29/10/2026</div></div>`
            card.querySelector('.nome').textContent = nome
            card.querySelector('.sub').textContent = subtitulo
          },
          { numero, nome, subtitulo },
        )
        .catch(() => undefined)
      await sleep(ms)
      await pagina
        .evaluate(() => {
          const card = document.getElementById('demo-capitulo')
          if (!card) return
          card.style.opacity = '0'
          setTimeout(() => card.remove(), 600)
        })
        .catch(() => undefined)
      await sleep(500)
      await api.atualizarLegenda()
    },
    async ir(rota, espera = 1200) {
      await pagina.goto(`${BASE}${rota}`, { waitUntil: 'domcontentloaded' })
      await pagina.waitForLoadState('networkidle').catch(() => undefined)
      await sleep(espera)
      await api.reaplicar()
    },
    async moverPara(locator) {
      await locator.scrollIntoViewIfNeeded().catch(() => undefined)
      const caixa = await locator.boundingBox().catch(() => null)
      if (!caixa) return false
      await pagina.mouse.move(caixa.x + caixa.width / 2, caixa.y + caixa.height / 2, { steps: 14 })
      await sleep(320)
      return true
    },
    async clicar(locator, { espera = 900, titulo = null, texto = null } = {}) {
      if (titulo) await api.narrar(titulo, texto ?? '', 1200)
      await api.moverPara(locator)
      await locator.click()
      await sleep(espera)
      await api.reaplicar()
    },
    async preencher(locator, valor, { espera = 600 } = {}) {
      await api.moverPara(locator)
      await locator.click()
      const tipo = (await locator.getAttribute('type')) ?? 'text'
      if (tipo === 'date' || tipo === 'time' || tipo === 'datetime-local') {
        // Campos nativos de data não aceitam digitação caractere a caractere:
        // preencher direto (ISO) e avisar o React com change/input.
        await locator.fill(String(valor))
        await locator.dispatchEvent('change')
        await locator.dispatchEvent('input')
      } else {
        await locator.fill('')
        await locator.pressSequentially(String(valor), { delay: 45 })
      }
      await sleep(espera)
    },
    async selecionar(locator, valor, { espera = 700 } = {}) {
      await api.moverPara(locator)
      await locator.selectOption(valor)
      await sleep(espera)
      await api.reaplicar()
    },
    async finalizar(parte) {
      const caminho = await pagina.video()?.path()
      await contexto.close()
      await navegador.close()
      const destino = join(DIR_VIDEO, `${parte}.webm`)
      if (caminho) copyFileSync(caminho, destino)
      writeFileSync(
        join(DIR_VIDEO, `${parte}-narracao.json`),
        JSON.stringify(estado.narracao, null, 2),
        'utf8',
      )
      return destino
    },
  }

  await api.reaplicar()
  return api
}

/** Gera SRT a partir da narração de uma parte. */
export function gerarSrt(narracao) {
  const fmt = (segundos) => {
    const h = String(Math.floor(segundos / 3600)).padStart(2, '0')
    const m = String(Math.floor((segundos % 3600) / 60)).padStart(2, '0')
    const s = String(segundos % 60).padStart(2, '0')
    return `${h}:${m}:${s},000`
  }
  return narracao
    .map((item, indice) => {
      const proximo = narracao[indice + 1]
      const fim = proximo ? Math.max(item.segundo + 2, proximo.segundo) : item.segundo + 5
      return `${indice + 1}\n${fmt(item.segundo)} --> ${fmt(fim)}\n${item.titulo}\n${item.texto}\n`
    })
    .join('\n')
}
