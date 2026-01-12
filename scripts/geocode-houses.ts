/**
 * Script to geocode existing houses that don't have coordinates
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/geocode-houses.ts
 *
 * Options:
 *   --dry-run    Show what would be updated without making changes
 *   --limit=N    Only process N houses (default: all)
 */

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { geocodeAddress } from '../src/lib/geocoding'

// Initialize Prisma with pg adapter (same as src/lib/prisma.ts)
const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL environment variable is required')
  process.exit(1)
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const limitArg = args.find(arg => arg.startsWith('--limit='))
  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

  console.log('='.repeat(60))
  console.log('Geocoding Houses Script')
  console.log('='.repeat(60))
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : 'LIVE (will update database)'}`)
  console.log(`Limit: ${limit || 'all houses'}`)
  console.log('')

  // Find houses without coordinates
  const housesWithoutCoords = await prisma.house.findMany({
    where: {
      OR: [
        { latitude: null },
        { longitude: null },
      ],
      deletedAt: null,
    },
    select: {
      id: true,
      address: true,
      city: true,
      state: true,
      zipCode: true,
      latitude: true,
      longitude: true,
    },
    take: limit,
  })

  console.log(`Found ${housesWithoutCoords.length} houses without coordinates`)
  console.log('')

  if (housesWithoutCoords.length === 0) {
    console.log('All houses have coordinates!')
    return
  }

  let successCount = 0
  let failCount = 0

  for (const house of housesWithoutCoords) {
    console.log(`Processing: ${house.address}, ${house.city}, ${house.state}`)

    const result = await geocodeAddress(
      house.address,
      house.city,
      house.state,
      house.zipCode
    )

    if (result) {
      console.log(`  ✓ Found: ${result.latitude}, ${result.longitude} (${result.source})`)

      if (!dryRun) {
        await prisma.house.update({
          where: { id: house.id },
          data: {
            latitude: result.latitude,
            longitude: result.longitude,
          },
        })
        console.log(`  ✓ Updated in database`)
      } else {
        console.log(`  - Would update in database (dry run)`)
      }

      successCount++
    } else {
      console.log(`  ✗ Could not geocode this address`)
      failCount++
    }

    console.log('')

    // Rate limit between requests
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  console.log('='.repeat(60))
  console.log('Summary')
  console.log('='.repeat(60))
  console.log(`Total processed: ${housesWithoutCoords.length}`)
  console.log(`Successfully geocoded: ${successCount}`)
  console.log(`Failed: ${failCount}`)

  if (dryRun) {
    console.log('')
    console.log('This was a dry run. Run without --dry-run to apply changes.')
  }
}

main()
  .catch((error) => {
    console.error('Script error:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
