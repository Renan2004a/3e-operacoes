export interface Sector {
  id: string
  code: string
  name: string
  active: boolean
  createdAt: Date
  updatedAt: Date
}

export interface SectorRepository {
  /** Busca um setor pelo código, ativo ou inativo, ou null se não existir. */
  findByCode(code: string): Promise<Sector | null>
  /** Lista apenas setores ativos. */
  listActive(): Promise<Sector[]>
  /** Persiste um novo setor ativo. */
  create(input: { code: string; name: string }): Promise<Sector>
  /** Marca o setor como inativo sem removê-lo. */
  deactivate(id: string): Promise<Sector>
}

export class CodigoSetorInvalidoError extends Error {
  constructor(code: string) {
    super(`Código de setor inválido: "${code}"`)
    this.name = 'CodigoSetorInvalidoError'
  }
}

export class SetorJaExisteError extends Error {
  constructor(code: string) {
    super(`Setor já existe: ${code}`)
    this.name = 'SetorJaExisteError'
  }
}

export interface CriarSetorInput {
  code: string
  name: string
}

/** Cria um setor ativo; rejeita código vazio e código já existente. */
export async function criarSetor(input: CriarSetorInput, repo: SectorRepository): Promise<Sector> {
  const code = input.code.trim()
  if (code.length === 0) throw new CodigoSetorInvalidoError(input.code)

  const existing = await repo.findByCode(code)
  if (existing) throw new SetorJaExisteError(code)

  return repo.create({ code, name: input.name })
}

/** Lista os setores ativos. */
export async function listarSetores(repo: SectorRepository): Promise<Sector[]> {
  return repo.listActive()
}

/** Inativa um setor preservando o registro. */
export async function inativarSetor(id: string, repo: SectorRepository): Promise<Sector> {
  return repo.deactivate(id)
}
