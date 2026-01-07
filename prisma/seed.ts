import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'

// Initialize Prisma with pg adapter for Prisma 7
const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting database seed...')

  // Get admin credentials from environment
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hometrace.com'
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123456'

  if (adminPassword.length < 8) {
    throw new Error('Admin password must be at least 8 characters')
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  // Create or update admin user
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: 'System Admin',
      passwordHash,
      role: UserRole.ADMIN,
      hasCompletedOnboarding: true,
    },
    create: {
      email: adminEmail,
      name: 'System Admin',
      passwordHash,
      role: UserRole.ADMIN,
      hasCompletedOnboarding: true,
      timezone: 'America/New_York',
    },
  })

  console.log(`Admin user created/updated: ${admin.email}`)

  // Create demo data for development
  if (process.env.NODE_ENV === 'development') {
    console.log('Creating development demo data...')

    // Create demo Realtor
    const realtorPassword = await bcrypt.hash('realtor123', 12)
    const realtor = await prisma.user.upsert({
      where: { email: 'realtor@demo.com' },
      update: {},
      create: {
        email: 'realtor@demo.com',
        name: 'Jane Smith',
        phone: '+1 (555) 123-4567',
        passwordHash: realtorPassword,
        role: UserRole.REALTOR,
        hasCompletedOnboarding: true,
        timezone: 'America/New_York',
      },
    })
    console.log(`Demo Realtor created: ${realtor.email}`)

    // Create demo Buyer
    const buyerPassword = await bcrypt.hash('buyer12345', 12)
    const buyer = await prisma.user.upsert({
      where: { email: 'buyer@demo.com' },
      update: {},
      create: {
        email: 'buyer@demo.com',
        name: 'John Doe',
        phone: '+1 (555) 987-6543',
        passwordHash: buyerPassword,
        role: UserRole.BUYER,
        hasCompletedOnboarding: false,
        timezone: 'America/New_York',
      },
    })
    console.log(`Demo Buyer created: ${buyer.email}`)

    // Create buyer-realtor connection
    await prisma.buyerRealtor.upsert({
      where: {
        buyerId_realtorId: {
          buyerId: buyer.id,
          realtorId: realtor.id,
        },
      },
      update: {},
      create: {
        buyerId: buyer.id,
        realtorId: realtor.id,
        invitedById: realtor.id,
      },
    })
    console.log('Demo Buyer-Realtor connection created')

    // Create privacy settings for buyer
    await prisma.privacySettings.upsert({
      where: { buyerId: buyer.id },
      update: {},
      create: {
        buyerId: buyer.id,
        shareReportWithRealtor: false,
        shareDreamHouseProfile: false,
        shareRecordings: false,
      },
    })
    console.log('Demo Privacy settings created')

    // Create demo houses
    const houses = [
      {
        address: '123 Oak Street',
        city: 'Austin',
        state: 'TX',
        zipCode: '78701',
        price: 485000,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1850,
        yearBuilt: 2015,
        propertyType: 'Single Family',
        listingStatus: 'active',
        images: [
          'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
          'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        ],
        description: 'Beautiful modern home with open floor plan',
        features: ['Hardwood floors', 'Granite countertops', 'Two-car garage', 'Fenced backyard'],
      },
      {
        address: '456 Maple Avenue',
        city: 'Austin',
        state: 'TX',
        zipCode: '78702',
        price: 525000,
        bedrooms: 4,
        bathrooms: 2.5,
        sqft: 2200,
        yearBuilt: 2018,
        propertyType: 'Single Family',
        listingStatus: 'active',
        images: [
          'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
          'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800',
        ],
        description: 'Spacious family home in quiet neighborhood',
        features: ['Swimming pool', 'Updated kitchen', 'Master suite', 'Smart home features'],
      },
      {
        address: '789 Cedar Lane',
        city: 'Austin',
        state: 'TX',
        zipCode: '78703',
        price: 395000,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1400,
        yearBuilt: 2020,
        propertyType: 'Townhouse',
        listingStatus: 'active',
        images: [
          'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800',
        ],
        description: 'Modern townhouse close to downtown',
        features: ['Rooftop deck', 'Energy efficient', 'Walk-in closets', 'Attached garage'],
      },
    ]

    for (const houseData of houses) {
      const house = await prisma.house.upsert({
        where: {
          externalId: `demo-${houseData.address.toLowerCase().replace(/\s+/g, '-')}`,
        },
        update: {},
        create: {
          ...houseData,
          externalId: `demo-${houseData.address.toLowerCase().replace(/\s+/g, '-')}`,
        },
      })

      // Add house to buyer's list (added by realtor)
      await prisma.houseBuyer.upsert({
        where: {
          houseId_buyerId: {
            houseId: house.id,
            buyerId: buyer.id,
          },
        },
        update: {},
        create: {
          houseId: house.id,
          buyerId: buyer.id,
          addedByRealtorId: realtor.id,
          realtorNotes: 'Great option within your budget!',
        },
      })
    }
    console.log('Demo houses created and added to buyer list')
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
