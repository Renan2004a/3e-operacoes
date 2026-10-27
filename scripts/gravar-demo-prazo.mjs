// Complemento do vídeo: alteração e restauração de prazo no pedido 82249.
// Grava docs/video/demo-prazo.webm.

import { chromium } from '@playwright/test'
import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://localhost:3000'
const DIR = join(process.cwd(), 'docs', 'video', 'tmp-demo')
mkdirSync(DIR, { recursive: true })
const navegador = await chromium.launch({ slowMo: 80 })
const contexto = await navegador.newContext({
  viewport: { width: 1280, height: 800 },
  locale: 'pt-BR',
  recordVideo: { dir: DIR, size: { width: 1280, height: 800 } },
})
const pagina = await contexto.newPage()

async function overlay(titulo, texto) {
  await pagina.evaluate(
    ({ titulo, texto }) => {
      let estilo = document.getElementById('demo-overlay-style')
      if (!estilo) {
        estilo = document.createElement('style')
        estilo.id = 'demo-overlay-style'
        estilo.textContent = `
          #demo-overlay { position: fixed; left: 24px; right: 24px; bottom: 24px; z-index: 2147483647;
            background: rgba(15,23,42,.95); color: #fff; border: 2px solid #fbbf24; border-radius: 14px;
            padding: 14px 20px; font-family: "Segoe UI", Arial, sans-serif;
            box-shadow: 0 10px 30px rgba(0,0,0,.35); pointer-events: none; }
          #demo-overlay .kicker { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: #fbbf24; font-weight: 700; }
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
      el.innerHTML = `<div class="kicker">3E Operações · alteração de prazo</div><div class="titulo"></div><div class="texto"></div>`
      el.querySelector('.titulo').textContent = titulo
      el.querySelector('.texto').textContent = texto
    },
    { titulo, texto },
  )
}

async function narrar(titulo, texto, ms = 6000) {
  await overlay(titulo, texto)
  await pagina.waitForTimeout(ms)
}

try {
  await pagina.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Entrar' }).waitFor({ timeout: 30000 })
  await narrar('Login', 'Vou entrar como Gerente para alterar e restaurar o prazo de um item com previsão já definida.', 5000)
  await pagina.waitForTimeout(1200)
  await pagina.getByLabel('E-mail').fill('gerente@3e.local')
  await pagina.getByLabel('Senha').fill('gerente123')
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
  await pagina.waitForTimeout(1000)

  await pagina.goto(`${BASE}/gerente/pedidos?numero=82249`, { waitUntil: 'domcontentloaded' })
  await pagina.getByRole('heading', { name: 'Pedidos', level: 1 }).waitFor({ timeout: 30000 })
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().waitFor({ timeout: 30000 })
  await narrar('Pedido 82249', 'Filtrei pelo pedido 82249. Vou abrir o detalhe e localizar o item que já tem prazo de entrega.', 6000)
  await pagina.getByRole('button', { name: /Abrir pedido/ }).first().click()
  await pagina.waitForURL(/\/pedidos\/.+/, { timeout: 30000 })
  await pagina.getByRole('button', { name: /(Recolher|Expandir) item/ }).first().waitFor({ timeout: 30000 })
  await pagina.waitForTimeout(1200)

  const abrirTodos = pagina.getByRole('button', { name: 'Abrir todos' })
  if ((await abrirTodos.count()) > 0) await abrirTodos.click()
  await pagina.waitForTimeout(800)

  let indice = 0
  let original = ''
  for (let i = 1; i <= 12; i += 1) {
    const campo = pagina.getByLabel(`Prazo de entrega (item ${i})`)
    if ((await campo.count()) === 0) continue
    const valor = await campo.first().inputValue()
    if (valor) {
      indice = i
      original = valor
      break
    }
  }

  if (!indice) {
    await narrar('Sem prazo', 'Nenhum item deste pedido tem prazo. O Gerente pode definir uma data no campo de prazo de entrega.', 5000)
  } else {
    const campo = pagina.getByLabel(`Prazo de entrega (item ${indice})`).first()
    await campo.scrollIntoViewIfNeeded()
    await pagina.waitForTimeout(800)
    await narrar(
      `Item ${indice} · prazo atual`,
      `O item ${indice} está previsto para ${original.split('-').reverse().join('/')}. Vou alterar para uma semana depois e salvar.`,
      6000,
    )
    const d = new Date(`${original}T12:00:00`)
    d.setDate(d.getDate() + 7)
    const novo = d.toISOString().slice(0, 10)
    await campo.fill(novo)
    await pagina.getByRole('button', { name: `Salvar prazo de entrega (item ${indice})` }).click()
    await pagina.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 30000 })
    await narrar('Prazo alterado', `Novo prazo: ${novo.split('-').reverse().join('/')}. O sistema confirma a gravação e mantém o histórico.`, 6000)

    const cartao = campo.locator('xpath=ancestor::div[contains(@class,"rounded-card")][1]')
    const historico = cartao.getByRole('button', { name: /Histórico de prazos/ }).first()
    await historico.scrollIntoViewIfNeeded()
    if ((await historico.getAttribute('aria-expanded')) !== 'true') await historico.click()
    await pagina.waitForTimeout(2200)
    await narrar('Histórico', 'O histórico mostra a alteração com usuário, data/hora e os valores anterior e novo.', 6000)

    await campo.fill(original)
    await pagina.getByRole('button', { name: `Salvar prazo de entrega (item ${indice})` }).click()
    await pagina.getByText('Prazo atualizado com sucesso.').waitFor({ timeout: 30000 })
    if ((await historico.getAttribute('aria-expanded')) === 'true') await historico.click()
    await historico.click()
    await pagina.waitForTimeout(2200)
    await narrar('Prazo restaurado', `Prazo restaurado para ${original.split('-').reverse().join('/')}. As duas alterações ficam no histórico para auditoria.`, 7000)
  }
} finally {
  const caminho = await pagina.video()?.path()
  await contexto.close()
  await navegador.close()
  if (caminho) {
    const destino = join(process.cwd(), 'docs', 'video', 'demo-prazo.webm')
    copyFileSync(caminho, destino)
    console.log('Complemento salvo em:', destino)
  }
}
