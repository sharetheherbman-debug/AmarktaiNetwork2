import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Admin user
  const passwordHash = await bcrypt.hash('admin123!', 12)
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@amarktai.com' },
    update: {},
    create: {
      email: 'admin@amarktai.com',
      passwordHash,
    },
  })
  console.log('✅ Admin user created:', admin.email)

  // Products
  const productData = [
    {
      name: 'Amarktai Crypto',
      slug: 'amarktai-crypto',
      category: 'Finance & AI',
      shortDescription: 'Advanced cryptocurrency intelligence platform with real-time AI signals and portfolio analytics.',
      longDescription: 'Amarktai Crypto is an institutional-grade cryptocurrency intelligence platform. Our proprietary AI models analyze on-chain data, social sentiment, and order book dynamics to deliver high-confidence trading insights.',
      status: 'invite_only',
      accessType: 'invite',
      featured: true,
      sortOrder: 1,
    },
    {
      name: 'Amarktai Forex',
      slug: 'amarktai-forex',
      category: 'Finance & AI',
      shortDescription: 'Institutional-grade forex analysis powered by proprietary AI models and market intelligence.',
      longDescription: 'Amarktai Forex brings institutional-level market intelligence to retail and professional traders. Our AI engine processes millions of data points per second.',
      status: 'invite_only',
      accessType: 'invite',
      featured: true,
      sortOrder: 2,
    },
    {
      name: 'Faith Haven',
      slug: 'faith-haven',
      category: 'Community',
      shortDescription: 'A digital space for faith communities to connect, grow, and build meaningful relationships.',
      status: 'in_development',
      accessType: 'public',
      featured: false,
      sortOrder: 3,
    },
    {
      name: 'Learn Digital',
      slug: 'learn-digital',
      category: 'Education',
      shortDescription: 'Adaptive digital learning platform designed for the next generation of technology professionals.',
      status: 'in_development',
      accessType: 'public',
      featured: false,
      sortOrder: 4,
    },
    {
      name: 'Jobs SA',
      slug: 'jobs-sa',
      category: 'Employment',
      shortDescription: 'South Africa-focused intelligent job matching platform connecting talent with opportunity.',
      status: 'coming_soon',
      accessType: 'public',
      featured: false,
      sortOrder: 5,
    },
    {
      name: 'Kinship',
      slug: 'kinship',
      category: 'Social',
      shortDescription: 'Community-driven platform fostering meaningful connections and shared experiences.',
      status: 'in_development',
      accessType: 'public',
      featured: false,
      sortOrder: 6,
    },
    {
      name: 'Amarktai Intelligence',
      slug: 'amarktai-intelligence',
      category: 'AI Platform',
      shortDescription: 'The unified AI intelligence layer powering all Amarktai Network applications.',
      status: 'concept',
      accessType: 'private',
      featured: false,
      sortOrder: 7,
    },
    {
      name: 'Amarktai Pay',
      slug: 'amarktai-pay',
      category: 'Fintech',
      shortDescription: 'Borderless digital payments and financial services for African markets.',
      status: 'concept',
      accessType: 'public',
      featured: false,
      sortOrder: 8,
    },
  ]

  for (const product of productData) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: {
        ...product,
        longDescription: product.longDescription || '',
        primaryUrl: '',
        hostedHere: false,
      },
    })
  }
  console.log(`✅ ${productData.length} products seeded`)

  // Sample contacts
  await prisma.contactSubmission.createMany({
    data: [
      {
        name: 'Thabo Nkosi',
        email: 'thabo@example.com',
        companyOrProject: 'TechVentures SA',
        message: 'Interested in a partnership with Amarktai Network for our fintech startup. Would love to discuss integration possibilities.',
      },
      {
        name: 'Sarah Johnson',
        email: 'sarah@innovate.io',
        companyOrProject: 'Innovate.io',
        message: 'We are building an AI-powered platform and are interested in your intelligence layer. Can we set up a call?',
      },
      {
        name: 'Amara Diallo',
        email: 'amara@afritech.co',
        companyOrProject: '',
        message: 'Requesting early access invitation for Amarktai Crypto. I am a professional trader based in Lagos.',
      },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Sample contacts seeded')

  // Sample waitlist entries
  await prisma.waitlistEntry.createMany({
    data: [
      { name: 'Kwame Asante', email: 'kwame@gmail.com', interest: 'crypto' },
      { name: 'Fatima Al-Hassan', email: 'fatima@outlook.com', interest: 'forex' },
      { name: 'David Oyelaran', email: 'david@yahoo.com', interest: 'all' },
      { name: 'Priya Naidoo', email: 'priya@proton.me', interest: 'learn-digital' },
      { name: 'Marcus Williams', email: 'marcus@icloud.com', interest: 'jobs-sa' },
      { name: 'Aisha Kamara', email: 'aisha@gmail.com', interest: 'faith-haven' },
      { name: 'John Mensah', email: 'john.mensah@gmail.com', interest: 'crypto' },
      { name: 'Nadia Boutros', email: 'nadia@outlook.com', interest: 'all' },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Sample waitlist entries seeded')

  console.log('✅ Seeding complete!')
  console.log('')
  console.log('🔑 Admin credentials:')
  console.log('   Email:    admin@amarktai.com')
  console.log('   Password: admin123!')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
