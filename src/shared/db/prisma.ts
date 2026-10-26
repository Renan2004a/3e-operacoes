import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@/generated/prisma/client'

function createAdapter() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL não configurada')

  const url = new URL(raw)
  // O pool precisa acomodar as telas que buscam indicadores em paralelo
  // (cada rota revalida a sessão) e a latência do RDS. Valores configuráveis
  // por ambiente; os padrões evitam o `pool timeout` de 10 s do driver.
  const limiteConfigurado = Number(process.env.DB_CONNECTION_LIMIT ?? 15)
  const esperaConfigurada = Number(process.env.DB_ACQUIRE_TIMEOUT_MS ?? 30_000)
  const connectionLimit =
    Number.isInteger(limiteConfigurado) && limiteConfigurado > 0 ? limiteConfigurado : 15
  const acquireTimeout =
    Number.isFinite(esperaConfigurada) && esperaConfigurada > 0 ? esperaConfigurada : 30_000

  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit,
    acquireTimeout,
  })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
