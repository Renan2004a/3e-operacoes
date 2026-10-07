export type MappingStatus = 'ACTIVE' | 'INACTIVE'

export interface CategorySectorMapping {
  id: string
  legacyCategory: string
  sectorId: string
  status: MappingStatus
  createdAt: Date
  updatedAt: Date
}

export interface MapeamentoAudit {
  action: 'CREATE' | 'UPDATE' | 'DEACTIVATE'
  entityType: 'CategorySectorMapping'
  entityId: string
  beforeJson: unknown | null
  afterJson: unknown | null
  userId?: string | null
}

export interface MapeamentoRepository {
  /** Busca o mapeamento da categoria, ativo ou inativo, ou null. */
  findByCategory(legacyCategory: string): Promise<CategorySectorMapping | null>
  /** Busca o mapeamento pelo id. */
  findById(id: string): Promise<CategorySectorMapping | null>
  /** Persiste um novo mapeamento ativo. */
  create(input: { legacyCategory: string; sectorId: string }): Promise<CategorySectorMapping>
  /** Atualiza o setor e o status do mapeamento. */
  update(id: string, input: { sectorId: string; status: MappingStatus }): Promise<CategorySectorMapping>
  /** Marca o mapeamento como inativo. */
  deactivate(id: string): Promise<CategorySectorMapping>
  /** Registra a alteração no AuditLog. */
  recordAudit(entry: MapeamentoAudit): Promise<void>
}

export class CategoriaJaMapeadaError extends Error {
  constructor(legacyCategory: string) {
    super(`Categoria já possui mapeamento ativo: ${legacyCategory}`)
    this.name = 'CategoriaJaMapeadaError'
  }
}

export class MapeamentoNaoEncontradoError extends Error {
  constructor(id: string) {
    super(`Mapeamento não encontrado: ${id}`)
    this.name = 'MapeamentoNaoEncontradoError'
  }
}

export interface CriarMapeamentoInput {
  legacyCategory: string
  sectorId: string
  userId?: string | null
}

/**
 * Cria um mapeamento ativo. Rejeita quando a categoria já tem mapeamento ativo
 * e reativa a linha existente quando ela está inativa (uma linha por categoria).
 */
export async function criarMapeamento(
  input: CriarMapeamentoInput,
  repo: MapeamentoRepository,
): Promise<CategorySectorMapping> {
  const legacyCategory = input.legacyCategory.trim()
  const existing = await repo.findByCategory(legacyCategory)
  if (existing && existing.status === 'ACTIVE') throw new CategoriaJaMapeadaError(legacyCategory)

  const mapping = existing
    ? await repo.update(existing.id, { sectorId: input.sectorId, status: 'ACTIVE' })
    : await repo.create({ legacyCategory, sectorId: input.sectorId })

  await repo.recordAudit({
    action: existing ? 'UPDATE' : 'CREATE',
    entityType: 'CategorySectorMapping',
    entityId: mapping.id,
    beforeJson: existing ? { sectorId: existing.sectorId, status: existing.status } : null,
    afterJson: {
      legacyCategory: mapping.legacyCategory,
      sectorId: mapping.sectorId,
      status: mapping.status,
    },
    userId: input.userId ?? null,
  })

  return mapping
}

export interface AlterarMapeamentoInput {
  id: string
  sectorId: string
  userId?: string | null
}

/** Altera o setor do mapeamento e registra antes/depois na auditoria. */
export async function alterarMapeamento(
  input: AlterarMapeamentoInput,
  repo: MapeamentoRepository,
): Promise<CategorySectorMapping> {
  const before = await repo.findById(input.id)
  if (!before) throw new MapeamentoNaoEncontradoError(input.id)

  const mapping = await repo.update(input.id, { sectorId: input.sectorId, status: 'ACTIVE' })

  await repo.recordAudit({
    action: 'UPDATE',
    entityType: 'CategorySectorMapping',
    entityId: mapping.id,
    beforeJson: { sectorId: before.sectorId, status: before.status },
    afterJson: { sectorId: mapping.sectorId, status: mapping.status },
    userId: input.userId ?? null,
  })

  return mapping
}

export interface InativarMapeamentoInput {
  id: string
  userId?: string | null
}

/** Inativa o mapeamento e registra a alteração na auditoria. */
export async function inativarMapeamento(
  input: InativarMapeamentoInput,
  repo: MapeamentoRepository,
): Promise<CategorySectorMapping> {
  const before = await repo.findById(input.id)
  if (!before) throw new MapeamentoNaoEncontradoError(input.id)

  const mapping = await repo.deactivate(input.id)

  await repo.recordAudit({
    action: 'DEACTIVATE',
    entityType: 'CategorySectorMapping',
    entityId: mapping.id,
    beforeJson: { sectorId: before.sectorId, status: before.status },
    afterJson: { sectorId: mapping.sectorId, status: mapping.status },
    userId: input.userId ?? null,
  })

  return mapping
}

/**
 * Garante um mapeamento para a categoria: reutiliza o ativo existente ou cria
 * um novo. Usado pela classificação manual que informa a categoria.
 */
export async function garantirMapeamento(
  input: CriarMapeamentoInput,
  repo: MapeamentoRepository,
): Promise<CategorySectorMapping> {
  const existing = await repo.findByCategory(input.legacyCategory.trim())
  if (existing && existing.status === 'ACTIVE') return existing
  return criarMapeamento(input, repo)
}
