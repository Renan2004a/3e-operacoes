/**
 * Seed inicial do banco próprio: setores, usuário administrador e os motivos de
 * ocorrência sugeridos. Idempotente (upsert), seguro para rodar mais de uma vez.
 *
 * Uso: `npm run prisma:seed` (com DATABASE_URL configurada e a migration aplicada).
 *
 * Os motivos são SUGESTÕES iniciais (docs/backlog/motivos-ocorrencia.md), ainda
 * sujeitas à validação do time; podem ser ajustados depois pela administração.
 */
import 'dotenv/config'
import { randomBytes, scrypt } from 'node:crypto'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../src/generated/prisma/client'

function hashSenha(senha: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(16)
    scrypt(senha, salt, 64, (erro, chave) => {
      if (erro) reject(erro)
      else resolve(`${salt.toString('hex')}:${chave.toString('hex')}`)
    })
  })
}

function criarCliente(): PrismaClient {
  const raw = process.env.DATABASE_URL
  if (!raw) throw new Error('DATABASE_URL não configurada')
  const url = new URL(raw)
  return new PrismaClient({
    adapter: new PrismaMariaDb({
      host: url.hostname,
      port: Number(url.port || 3306),
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ''),
      connectionLimit: 5,
    }),
  })
}

const SETORES = [
  { code: 'CORTE_DOBRA' as const, name: 'Corte e Dobra' },
  { code: 'TELHAS' as const, name: 'Telhas' },
  { code: 'REVENDA' as const, name: 'Revenda' },
]

/** Usuários de demonstração, um por perfil. Trocar as senhas em produção. */
const USUARIOS_DEMO = [
  {
    email: 'operador@3e.local',
    nome: 'Operador',
    senha: 'operador123',
    roles: ['OPERATOR'] as const,
    setores: ['CORTE_DOBRA', 'TELHAS'] as const,
  },
  {
    email: 'gerente@3e.local',
    nome: 'Gerente de Produção',
    senha: 'gerente123',
    roles: ['PRODUCTION_MANAGER'] as const,
    setores: [] as const,
  },
  {
    email: 'vendedor@3e.local',
    nome: 'Vendedor',
    senha: 'vendedor123',
    roles: ['SELLER'] as const,
    setores: [] as const,
  },
  {
    email: 'expedicao@3e.local',
    nome: 'Expedição',
    senha: 'expedicao123',
    roles: ['SHIPPING'] as const,
    setores: [] as const,
  },
]

const MOTIVOS = [
  { tipo: 'PERDA', codigo: 'DEFEITO_CORTE', descricao: 'Defeito de corte' },
  { tipo: 'PERDA', codigo: 'MATERIAL_PROBLEMA', descricao: 'Material com problema' },
  { tipo: 'PERDA', codigo: 'ERRO_DOBRA', descricao: 'Erro de dobra / medida incorreta' },
  { tipo: 'REFUGO', codigo: 'CORTE_ERRADO', descricao: 'Corte errado' },
  { tipo: 'REFUGO', codigo: 'DEFEITO_CHAPA', descricao: 'Defeito de chapa' },
  { tipo: 'REFUGO', codigo: 'COMPRIMENTO_INCORRETO', descricao: 'Comprimento/ajuste incorreto' },
  { tipo: 'INDISPONIBILIDADE', codigo: 'SEM_ESTOQUE', descricao: 'Sem estoque' },
  { tipo: 'INDISPONIBILIDADE', codigo: 'DESCONTINUADO', descricao: 'Item descontinuado' },
  {
    tipo: 'INDISPONIBILIDADE',
    codigo: 'SALDO_INSUFICIENTE',
    descricao: 'Saldo insuficiente para a quantidade solicitada',
  },
]

async function main() {
  const prisma = criarCliente()

  for (const setor of SETORES) {
    await prisma.sector.upsert({
      where: { code: setor.code },
      update: { name: setor.name, active: true },
      create: { code: setor.code, name: setor.name, active: true },
    })
  }

  for (const motivo of MOTIVOS) {
    await prisma.motivoOcorrencia.upsert({
      where: { tipo_codigo: { tipo: motivo.tipo, codigo: motivo.codigo } },
      update: { descricao: motivo.descricao, ativo: true },
      create: { ...motivo, ativo: true },
    })
  }

  const email = process.env.SEED_ADMIN_EMAIL ?? 'admin@3e.local'
  const senha = process.env.SEED_ADMIN_PASSWORD ?? 'admin123'
  const passwordHash = await hashSenha(senha)

  const admin = await prisma.user.upsert({
    where: { email },
    update: { name: 'Administrador', status: 'ACTIVE' },
    create: { name: 'Administrador', email, passwordHash, status: 'ACTIVE' },
  })

  await prisma.userRole.upsert({
    where: { userId_role: { userId: admin.id, role: 'SYSTEM_RESPONSIBLE' } },
    update: {},
    create: { userId: admin.id, role: 'SYSTEM_RESPONSIBLE' },
  })

  for (const demo of USUARIOS_DEMO) {
    const hash = await hashSenha(demo.senha)
    const usuario = await prisma.user.upsert({
      where: { email: demo.email },
      update: { name: demo.nome, status: 'ACTIVE' },
      create: { name: demo.nome, email: demo.email, passwordHash: hash, status: 'ACTIVE' },
    })
    for (const role of demo.roles) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: usuario.id, role } },
        update: {},
        create: { userId: usuario.id, role },
      })
    }
    for (const code of demo.setores) {
      const setor = await prisma.sector.findUnique({ where: { code } })
      if (setor) {
        await prisma.userSector.upsert({
          where: { userId_sectorId: { userId: usuario.id, sectorId: setor.id } },
          update: {},
          create: { userId: usuario.id, sectorId: setor.id },
        })
      }
    }
  }

  console.log(
    `Seed concluído: ${SETORES.length} setores, ${MOTIVOS.length} motivos, ${USUARIOS_DEMO.length + 1} usuários (admin ${email}).`,
  )
  await prisma.$disconnect()
}

main().catch((erro) => {
  console.error('Falha no seed:', erro)
  process.exitCode = 1
})
