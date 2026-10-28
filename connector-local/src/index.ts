import 'dotenv/config'
import { timingSafeEqual } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import express from 'express'
import mysql from 'mysql2/promise'
import { z } from 'zod'
import { consultarPedidoTopGerente, type LegadoQueryable } from './topgerente.js'

const requestSchema = z.object({
  jobId: z.string().min(1),
  orderNumber: z.string().min(1).max(64),
})

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface ImportOrderDeps {
  queryable: LegadoQueryable
  sharedToken: string
  callbackUrl: string
  callbackToken: string
  empresa?: number
  fetchImpl?: FetchLike
}

export interface ImportOrderResult {
  status: number
  body: Record<string, unknown>
}

/** Compara tokens sem vazar o tamanho por tempo de resposta. */
function tokenValido(recebido: string | null, esperado: string): boolean {
  if (!esperado || !recebido) return false
  const a = Buffer.from(recebido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Handler puro do conector: autentica, consulta o Top Gerente, normaliza e
 * devolve o payload por callback. Sem dependência de servidor HTTP, o que o
 * torna testável sem abrir porta.
 */
export async function handleImportOrder(
  request: { authorization: string | null; body: unknown },
  deps: ImportOrderDeps,
): Promise<ImportOrderResult> {
  const token = request.authorization?.replace(/^Bearer\s+/i, '') ?? null
  if (!tokenValido(token, deps.sharedToken)) {
    return { status: 401, body: { error: 'unauthorized' } }
  }

  const parsed = requestSchema.safeParse(request.body)
  if (!parsed.success) return { status: 400, body: { error: 'invalid_request' } }

  const { jobId, orderNumber } = parsed.data
  const result = await consultarPedidoTopGerente(deps.queryable, orderNumber, deps.empresa ?? 1)
  if (!result.found) return { status: 404, body: { error: 'order_not_found' } }

  const { items, ...order } = result.order
  const fetchImpl = deps.fetchImpl ?? fetch

  try {
    const response = await fetchImpl(deps.callbackUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${deps.callbackToken}`,
      },
      body: JSON.stringify({ jobId, order, items }),
    })
    if (!response.ok) return { status: 502, body: { error: 'callback_failed' } }
  } catch {
    return { status: 502, body: { error: 'callback_failed' } }
  }

  return { status: 202, body: { accepted: true, jobId } }
}

export function createApp(deps: ImportOrderDeps) {
  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '256kb' }))

  // Saúde de verdade: confirma que o MySQL do Top Gerente responde. Um 503
  // aqui evita descobrir a indisponibilidade só na primeira importação.
  app.get('/health', async (_req, res) => {
    try {
      await deps.queryable.query('SELECT 1', [])
      res.json({ status: 'ok' })
    } catch {
      res.status(503).json({ status: 'degraded' })
    }
  })

  app.post('/jobs/import-order', async (req, res) => {
    const result = await handleImportOrder(
      { authorization: req.header('authorization') ?? null, body: req.body },
      deps,
    )
    res.status(result.status).json(result.body)
  })

  // Tratamento final: JSON malformado ou falha inesperada não devolvem stack
  // trace nem detalhes internos ao chamador.
  app.use(
    (
      erro: unknown,
      _req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      if (erro instanceof SyntaxError) return res.status(400).json({ error: 'invalid_json' })
      console.error('[connector] erro inesperado', erro instanceof Error ? erro.message : erro)
      if (res.headersSent) return next(erro)
      return res.status(500).json({ error: 'internal_error' })
    },
  )

  return app
}

function createLegadoQueryable(): LegadoQueryable {
  const pool = mysql.createPool({
    host: process.env.TOPGERENTE_HOST,
    port: Number(process.env.TOPGERENTE_PORT ?? 3306),
    database: process.env.TOPGERENTE_DATABASE,
    user: process.env.TOPGERENTE_USER,
    password: process.env.TOPGERENTE_PASSWORD,
    connectionLimit: 2,
    connectTimeout: 10_000,
    enableKeepAlive: true,
  })

  // Defesa em profundidade: a sessão do conector não pode escrever no legado,
  // mesmo que uma query futura seja escrita por engano.
  pool.on('connection', (conexao) => {
    conexao.query('SET SESSION TRANSACTION READ ONLY')
  })

  return {
    query: (sql, params) => pool.query(sql, params) as Promise<[unknown, unknown?]>,
  }
}

function buildDepsFromEnv(): ImportOrderDeps {
  return {
    queryable: createLegadoQueryable(),
    sharedToken: process.env.CONNECTOR_SHARED_TOKEN ?? '',
    callbackUrl: process.env.RAILWAY_CALLBACK_URL ?? '',
    callbackToken: process.env.CONNECTOR_CALLBACK_TOKEN ?? '',
    empresa: Number(process.env.TOPGERENTE_EMPRESA ?? 1),
  }
}

const entry = process.argv[1]
if (entry && pathToFileURL(entry).href === import.meta.url) {
  const port = Number(process.env.PORT ?? 8787)
  createApp(buildDepsFromEnv()).listen(port, () => console.log(`3E connector listening on ${port}`))
}
