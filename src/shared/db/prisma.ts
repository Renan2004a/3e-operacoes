import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@/generated/prisma/client'

function createAdapter() {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL não configurada')

  const url = new URL(raw)
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit: 5,
  })
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter: createAdapter() })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
