// Gera cartões de capítulo (1920x1080) para abertura de cada parte.
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = join(process.cwd(), 'docs', 'video-demo-2026-10-29', 'cards')
mkdirSync(DIR, { recursive: true })

const cards = [
  {
    arquivo: 'parte1',
    numero: 'Capítulo 1',
    titulo: 'Apresentação do sistema',
    subtitulo:
      '3E Operações: pedidos, produção, expedição e banco de dados. Ambiente de demonstração com dados de teste.',
  },
  {
    arquivo: 'parte2',
    numero: 'Capítulo 5',
    titulo: 'Gerente — painel e alertas',
    subtitulo:
      'Indicadores da fábrica, alertas operacionais, drill-down por status e ocorrências recentes.',
  },
  {
    arquivo: 'parte3',
    numero: 'Capítulo 9',
    titulo: 'Operador — fila, execução e ocorrências',
    subtitulo:
      'Fila por setor, registro de produção, perdas e paradas, histórico e ordem de produção.',
  },
  {
    arquivo: 'parte4',
    numero: 'Capítulo 11',
    titulo: 'Administração — usuários, setores e mapeamentos',
    subtitulo:
      'Cadastro de usuários, perfis, inativação, setores, de/para categoria→setor e regras.',
  },
  {
    arquivo: 'parte5',
    numero: 'Capítulo 15',
    titulo: 'Banco de dados — estrutura e persistência',
    subtitulo:
      'DBeaver, tabelas, relacionamentos, consultas reais e a conferência dos registros criados na interface.',
  },
]

const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1920, height: 1080 } })

for (const card of cards) {
  await pagina.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <style>
    * { box-sizing: border-box; }
    body { margin:0; width:1920px; height:1080px; display:grid; place-items:center;
      background: radial-gradient(circle at 25% 20%, #123a47 0%, #081018 55%, #050b11 100%);
      color:#f8fafc; font-family:"Segoe UI", Arial, sans-serif; }
    .caixa { text-align:center; max-width:1400px; padding:60px; }
    .marca { font-size:20px; letter-spacing:.18em; text-transform:uppercase; color:#67e8f9; font-weight:700; }
    .numero { margin-top:42px; font-size:24px; letter-spacing:.22em; text-transform:uppercase; color:#94a3b8; font-weight:700; }
    .titulo { margin-top:16px; font-size:64px; font-weight:800; line-height:1.1; }
    .sub { margin:28px auto 0; font-size:26px; line-height:1.45; color:#cbd5e1; max-width:1200px; }
    .rodape { margin-top:56px; font-size:18px; color:#7d8b99; letter-spacing:.08em; }
    .linha { width:180px; height:4px; background:#0e7490; margin:34px auto 0; border-radius:2px; }
  </style></head><body>
    <div class="caixa">
      <div class="marca">3E Operações · demonstração</div>
      <div class="numero">${card.numero}</div>
      <div class="titulo">${card.titulo}</div>
      <div class="linha"></div>
      <div class="sub">${card.subtitulo}</div>
      <div class="rodape">3E Ferro e Aço · 29/10/2026</div>
    </div>
  </body></html>`)
  await pagina.waitForTimeout(300)
  await pagina.screenshot({ path: join(DIR, `${card.arquivo}.png`) })
  console.log('cartão:', card.arquivo)
}

await navegador.close()
