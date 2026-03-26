import crypto from 'crypto'

/** Derive a 32-byte key from ENCRYPTION_SECRET using SHA-256. */
function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET
  if (!secret) throw new Error('ENCRYPTION_SECRET env var is not set')
  return crypto.createHash('sha256').update(secret).digest()
}

/**
 * AES-256-GCM encrypt.
 * Returns a colon-separated string: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12) // 96-bit nonce recommended for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag() // 128-bit authentication tag
  return [iv.toString('hex'), authTag.toString('hex'), encrypted.toString('hex')].join(':')
}

/**
 * AES-256-GCM decrypt.
 * Throws if the ciphertext is tampered with (authTag mismatch) or malformed.
 */
export function decrypt(stored: string): string {
  const parts = stored.split(':')
  if (parts.length !== 3) throw new Error('Invalid ciphertext format')
  const [ivHex, authTagHex, encryptedHex] = parts
  const key = getKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const encrypted = Buffer.from(encryptedHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
}

/** Returns "sk-...xK9f" style masked display string. Never expose full key to browser. */
export function maskApiKey(key: string): string {
  if (key.length <= 4) return '****'
  return `sk-...${key.slice(-4)}`
}

/** Returns "abcd...wxyz" style masked display string for arbitrary secrets. */
export function maskSecret(key: string): string {
  const trimmed = key.trim()
  if (trimmed.length <= 8) return '****'
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}
