import { prisma } from './prisma'
import crypto from 'crypto'

// Configuration keys used in the system
export const CONFIG_KEYS = {
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  RESEND_API_KEY: 'RESEND_API_KEY',
  RAPIDAPI_KEY: 'RAPIDAPI_KEY',
  STORAGE_PATH: 'STORAGE_PATH',
  JWT_SECRET: 'JWT_SECRET',
  JWT_EXPIRES_IN: 'JWT_EXPIRES_IN',
  REALTY_API_HOST: 'REALTY_API_HOST',
} as const

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS]

// Encryption key derived from JWT_SECRET or a default for development
const getEncryptionKey = (): Buffer => {
  const secret = process.env.JWT_SECRET || 'default-encryption-key-32-chars!'
  return crypto.scryptSync(secret, 'salt', 32)
}

// Simple AES-256-GCM encryption
const encrypt = (text: string): string => {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

const decrypt = (encryptedText: string): string => {
  try {
    const key = getEncryptionKey()
    const parts = encryptedText.split(':')

    if (parts.length !== 3) {
      // Not encrypted, return as-is (for backward compatibility)
      return encryptedText
    }

    const iv = Buffer.from(parts[0], 'hex')
    const authTag = Buffer.from(parts[1], 'hex')
    const encrypted = parts[2]

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch {
    // If decryption fails, return original (might not be encrypted)
    return encryptedText
  }
}

// In-memory cache with TTL
const configCache: Map<string, { value: string; timestamp: number }> = new Map()
const CACHE_TTL = 60000 // 1 minute

/**
 * Get a configuration value from the database
 * Falls back to process.env if not found in database
 */
export async function getConfig(key: ConfigKey): Promise<string | null> {
  // Check cache first
  const cached = configCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key },
    })

    if (config) {
      const decryptedValue = config.isSecret ? decrypt(config.value) : config.value

      // Update cache
      configCache.set(key, { value: decryptedValue, timestamp: Date.now() })

      return decryptedValue
    }
  } catch (error) {
    console.error(`Error fetching config ${key} from database:`, error)
  }

  // Fallback to environment variable
  const envValue = process.env[key] || null
  if (envValue) {
    configCache.set(key, { value: envValue, timestamp: Date.now() })
  }

  return envValue
}

/**
 * Get a configuration value synchronously (from cache or env)
 * Use this only when async is not possible
 */
export function getConfigSync(key: ConfigKey): string | null {
  const cached = configCache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.value
  }
  return process.env[key] || null
}

/**
 * Set a configuration value in the database
 */
export async function setConfig(
  key: ConfigKey,
  value: string,
  options?: {
    description?: string
    isSecret?: boolean
  }
): Promise<void> {
  const isSecret = options?.isSecret ?? true
  const encryptedValue = isSecret ? encrypt(value) : value

  await prisma.systemConfig.upsert({
    where: { key },
    update: {
      value: encryptedValue,
      description: options?.description,
      isSecret,
    },
    create: {
      key,
      value: encryptedValue,
      description: options?.description,
      isSecret,
    },
  })

  // Update cache
  configCache.set(key, { value, timestamp: Date.now() })
}

/**
 * Delete a configuration value from the database
 */
export async function deleteConfig(key: ConfigKey): Promise<void> {
  await prisma.systemConfig.delete({
    where: { key },
  }).catch(() => {
    // Ignore if not found
  })

  configCache.delete(key)
}

/**
 * Get all configuration values (for admin display)
 * Returns masked values for secrets
 */
export async function getAllConfigs(): Promise<
  Array<{
    key: string
    value: string
    description: string | null
    isSecret: boolean
    isConfigured: boolean
    lastUsedAt: Date | null
    updatedAt: Date
  }>
> {
  const configs = await prisma.systemConfig.findMany({
    orderBy: { key: 'asc' },
  })

  return configs.map((config) => ({
    key: config.key,
    value: config.isSecret ? maskValue(decrypt(config.value)) : config.value,
    description: config.description,
    isSecret: config.isSecret,
    isConfigured: true,
    lastUsedAt: config.lastUsedAt,
    updatedAt: config.updatedAt,
  }))
}

/**
 * Check if a config is set (either in DB or env)
 */
export async function isConfigured(key: ConfigKey): Promise<boolean> {
  const value = await getConfig(key)
  return !!value && value.length > 0
}

/**
 * Update lastUsedAt for a config key
 */
export async function markConfigUsed(key: ConfigKey): Promise<void> {
  try {
    await prisma.systemConfig.update({
      where: { key },
      data: { lastUsedAt: new Date() },
    })
  } catch {
    // Ignore if not found
  }
}

/**
 * Mask a value for display (e.g., "sk-ant-xxx...xxx")
 */
function maskValue(value: string): string {
  if (!value || value.length < 8) return '••••••••'
  return `${value.substring(0, 7)}...${value.substring(value.length - 4)}`
}

/**
 * Clear the config cache (useful after updates)
 */
export function clearConfigCache(): void {
  configCache.clear()
}

/**
 * Initialize default configs from environment variables
 * Call this on app startup to migrate env vars to database
 */
export async function initializeDefaultConfigs(): Promise<void> {
  const defaults: Array<{
    key: ConfigKey
    envKey: string
    description: string
    isSecret: boolean
  }> = [
    {
      key: CONFIG_KEYS.ANTHROPIC_API_KEY,
      envKey: 'ANTHROPIC_API_KEY',
      description: 'Anthropic API key for Claude AI (chat, analysis, reports)',
      isSecret: true,
    },
    {
      key: CONFIG_KEYS.RESEND_API_KEY,
      envKey: 'RESEND_API_KEY',
      description: 'Resend API key for sending emails',
      isSecret: true,
    },
    {
      key: CONFIG_KEYS.RAPIDAPI_KEY,
      envKey: 'RAPIDAPI_KEY',
      description: 'RapidAPI key for Realty in US property API',
      isSecret: true,
    },
    {
      key: CONFIG_KEYS.STORAGE_PATH,
      envKey: 'STORAGE_PATH',
      description: 'Path for file storage',
      isSecret: false,
    },
    {
      key: CONFIG_KEYS.REALTY_API_HOST,
      envKey: 'REALTY_API_HOST',
      description: 'Realty API host URL',
      isSecret: false,
    },
  ]

  for (const config of defaults) {
    const envValue = process.env[config.envKey]

    if (envValue) {
      // Check if already in database
      const existing = await prisma.systemConfig.findUnique({
        where: { key: config.key },
      })

      if (!existing) {
        // Migrate from env to database
        await setConfig(config.key, envValue, {
          description: config.description,
          isSecret: config.isSecret,
        })
        console.log(`[Config] Migrated ${config.key} from environment to database`)
      }
    }
  }
}
