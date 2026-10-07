import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const SALT_BYTES = 16
const KEY_BYTES = 64

function derivar(senha: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(senha, salt, KEY_BYTES, (erro, chave) => {
      if (erro) reject(erro)
      else resolve(chave)
    })
  })
}

/** Gera o hash `scrypt` de uma senha com sal aleatório por senha (AUTH-05). */
export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES)
  const derivado = await derivar(senha, salt)
  return `${salt.toString('hex')}:${derivado.toString('hex')}`
}

/**
 * Confere uma senha contra o hash `salt:hash` (AUTH-05).
 * Hash malformado é tratado como senha incorreta.
 */
export async function verificarSenha(senha: string, hash: string): Promise<boolean> {
  const [saltHex, hashHex] = hash.split(':')
  if (!saltHex || !hashHex) return false

  const salt = Buffer.from(saltHex, 'hex')
  const esperado = Buffer.from(hashHex, 'hex')
  if (salt.length !== SALT_BYTES || esperado.length !== KEY_BYTES) return false

  const derivado = await derivar(senha, salt)
  return timingSafeEqual(derivado, esperado)
}
