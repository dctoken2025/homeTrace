import 'dotenv/config'
import { PrismaClient, UserRole } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as bcrypt from 'bcryptjs'
import * as crypto from 'crypto'

// Initialize Prisma with pg adapter for Prisma 7
const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Encryption helper for system configs
const getEncryptionKey = (): Buffer => {
  const secret = process.env.JWT_SECRET || 'default-encryption-key-32-chars!'
  return crypto.scryptSync(secret, 'salt', 32)
}

const encrypt = (text: string): string => {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`
}

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

  // Initialize system configurations from environment variables
  console.log('Initializing system configurations...')

  const configsToInit = [
    { key: 'ANTHROPIC_API_KEY', envKey: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude AI (chat, analysis, reports)', isSecret: true },
    { key: 'RESEND_API_KEY', envKey: 'RESEND_API_KEY', description: 'Resend API key for sending emails', isSecret: true },
    { key: 'RAPIDAPI_KEY', envKey: 'RAPIDAPI_KEY', description: 'RapidAPI key for Realty in US property API', isSecret: true },
    { key: 'STORAGE_PATH', envKey: 'STORAGE_PATH', description: 'Path for file storage', isSecret: false },
    { key: 'REALTY_API_HOST', envKey: 'REALTY_API_HOST', description: 'Realty API host URL', isSecret: false },
  ]

  for (const config of configsToInit) {
    const envValue = process.env[config.envKey]
    if (envValue) {
      const existing = await prisma.systemConfig.findUnique({ where: { key: config.key } })
      if (!existing) {
        await prisma.systemConfig.create({
          data: {
            key: config.key,
            value: config.isSecret ? encrypt(envValue) : envValue,
            description: config.description,
            isSecret: config.isSecret,
          },
        })
        console.log(`  - ${config.key}: migrated from environment`)
      } else {
        console.log(`  - ${config.key}: already exists in database`)
      }
    } else {
      console.log(`  - ${config.key}: not set in environment`)
    }
  }

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

    // Create demo DreamHouseProfile for buyer
    await prisma.dreamHouseProfile.upsert({
      where: { buyerId: buyer.id },
      update: {},
      create: {
        buyerId: buyer.id,
        isComplete: true,
        profile: {
          budget: { min: 350000, max: 550000 },
          locations: ['Austin, TX', 'Round Rock, TX'],
          bedrooms: { min: 3 },
          bathrooms: { min: 2 },
          sqft: { min: 1500, max: 2500 },
          propertyTypes: ['Single Family', 'Townhouse'],
          mustHaveFeatures: ['Garage', 'Backyard', 'Modern Kitchen'],
          niceToHaveFeatures: ['Pool', 'Home Office', 'Smart Home'],
          dealBreakers: ['No HOA restrictions', 'Not on busy road'],
          lifestyle: 'Young professional couple, work from home 3 days/week, enjoy hosting friends',
          moveInTimeline: '3-6 months',
          additionalNotes: 'Looking for a home with good natural light and open floor plan. Prefer quiet neighborhood but close to restaurants.',
          aiGeneratedSummary: 'Tech-savvy couple seeking modern 3+ bedroom home in Austin area. Budget-conscious but prioritizing quality of life features. Key priorities: work-from-home space, entertaining areas, and low-maintenance outdoor space.',
        },
        trainingChats: [
          {
            role: 'user',
            content: 'I am looking for a 3-bedroom home in Austin with a budget of around $450,000.',
            timestamp: new Date().toISOString(),
          },
          {
            role: 'assistant',
            content: 'Great! Austin is a wonderful area. What features are most important to you in your new home?',
            timestamp: new Date().toISOString(),
          },
        ],
      },
    })
    console.log('Demo DreamHouseProfile created')

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
