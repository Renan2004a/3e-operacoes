import express from 'express'
import { z } from 'zod'

const app = express()
app.use(express.json())

const requestSchema = z.object({
  jobId: z.string().min(1),
  orderNumber: z.string().min(1).max(64),
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.post('/jobs/import-order', async (req, res) => {
  const token = req.header('authorization')?.replace(/^Bearer\s+/i, '')
  if (!process.env.CONNECTOR_SHARED_TOKEN || token !== process.env.CONNECTOR_SHARED_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  const parsed = requestSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'invalid_request' })

  // Intencionalmente não implementado no bootstrap:
  // 1) consultar Top Gerente com SQL parametrizado e usuário SELECT;
  // 2) normalizar payload mínimo;
  // 3) POST callback autenticado para o Railway;
  return res.status(202).json({ accepted: true, jobId: parsed.data.jobId })
})

const port = Number(process.env.PORT ?? 8787)
app.listen(port, () => console.log(`3E connector listening on ${port}`))
