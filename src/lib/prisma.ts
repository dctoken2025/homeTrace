import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const prismaClientSingleton = () => {
  const connectionString = process.env.DATABASE_URL!
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)

  const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

  return prisma
}

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>
}

export const prisma = globalThis.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

// Helper to include deleted records when needed (for admin)
export function withDeleted<T extends { deletedAt?: Date | null }>(
  where: T
): T & { deletedAt?: undefined } {
  return { ...where, deletedAt: undefined }
}

// Helper to get only deleted records (for admin)
export function onlyDeleted<T extends object>(where: T): T & { deletedAt: { not: null } } {
  return { ...where, deletedAt: { not: null } }
}

export default prisma
