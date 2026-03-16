import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

const prisma = new PrismaClient()

function genToken() {
  return `amkt_${crypto.randomBytes(32).toString('hex')}`
}

function genMetricPoints(productId: number, metricKey: string, count: number, min: number, max: number) {
  return Array.from({ length: count }, (_, i) => ({
    productId,
    metricKey,
    metricValue: parseFloat((min + Math.random() * (max - min)).toFixed(2)),
    metricLabel: '',
    timestamp: new Date(Date.now() - (count - 1 - i) * 30 * 60 * 1000),
  }))
}

function genVpsSnapshots(productId: number, count: number) {
  const cpuBase = 20 + Math.random() * 40
  const ramBase = 30 + Math.random() * 40
  return Array.from({ length: count }, (_, i) => ({
    productId,
    cpuPercent: parseFloat((Math.max(5, Math.min(95, cpuBase + (Math.random() * 20 - 10)))).toFixed(1)),
    ramPercent: parseFloat((Math.max(10, Math.min(90, ramBase + (Math.random() * 15 - 7)))).toFixed(1)),
    ramUsedMb: parseFloat(((ramBase / 100) * 4096 + (Math.random() * 512 - 256)).toFixed(0)),
    ramTotalMb: 4096,
    diskPercent: parseFloat((15 + Math.random() * 35).toFixed(1)),
    diskUsedGb: parseFloat((3 + Math.random() * 15).toFixed(2)),
    diskTotalGb: 80,
    netInKbps: parseFloat((50 + Math.random() * 300).toFixed(1)),
    netOutKbps: parseFloat((20 + Math.random() * 150).toFixed(1)),
    timestamp: new Date(Date.now() - (count - 1 - i) * 5 * 60 * 1000),
  }))
}

async function main() {
  console.log('🌱 Seeding Amarktai Network database...')

  // ── Admin ──────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('admin123!', 12)
  await prisma.adminUser.upsert({
    where: { email: 'admin@amarktai.com' },
    update: {},
    create: { email: 'admin@amarktai.com', passwordHash },
  })
  console.log('✅ Admin user: admin@amarktai.com / admin123!')

  // ── Products ───────────────────────────────────────────────────────
  const products = [
    {
      name: 'Amarktai Crypto',
      slug: 'amarktai-crypto',
      category: 'Finance & AI',
      shortDescription: 'Advanced cryptocurrency intelligence platform with real-time AI signals and portfolio analytics.',
      longDescription: 'Amarktai Crypto is an institutional-grade cryptocurrency intelligence platform. Our proprietary AI models analyze on-chain data, social sentiment, and order book dynamics to deliver high-confidence trading insights.',
      status: 'invite_only', accessType: 'invite', featured: true,
      hostedHere: true, hostingScope: 'subdomain', subdomain: 'crypto', customDomain: '',
      environment: 'production', publicVisibility: true, monitoringEnabled: true, integrationEnabled: true,
      primaryUrl: 'https://crypto.amarktai.com', sortOrder: 1,
    },
    {
      name: 'Amarktai Forex',
      slug: 'amarktai-forex',
      category: 'Finance & AI',
      shortDescription: 'Institutional-grade forex analysis powered by proprietary AI models and market intelligence.',
      longDescription: 'Amarktai Forex brings institutional-level market intelligence to retail and professional traders. Our AI engine processes millions of data points per second.',
      status: 'invite_only', accessType: 'invite', featured: true,
      hostedHere: true, hostingScope: 'subdomain', subdomain: 'forex', customDomain: '',
      environment: 'production', publicVisibility: true, monitoringEnabled: true, integrationEnabled: true,
      primaryUrl: 'https://forex.amarktai.com', sortOrder: 2,
    },
    {
      name: 'Faith Haven',
      slug: 'faith-haven',
      category: 'Community',
      shortDescription: 'A digital space for faith communities to connect, grow, and build meaningful relationships.',
      longDescription: 'Faith Haven is building a premium digital sanctuary for faith communities worldwide.',
      status: 'in_development', accessType: 'public', featured: false,
      hostedHere: false, hostingScope: 'external_domain', subdomain: '', customDomain: 'faithhaven.app',
      environment: 'staging', publicVisibility: true, monitoringEnabled: true, integrationEnabled: true,
      primaryUrl: 'https://faithhaven.app', sortOrder: 3,
    },
    {
      name: 'Learn Digital',
      slug: 'learn-digital',
      category: 'Education',
      shortDescription: 'Adaptive digital learning platform designed for the next generation of technology professionals.',
      longDescription: 'Learn Digital is an adaptive education platform that meets learners where they are.',
      status: 'in_development', accessType: 'public', featured: false,
      hostedHere: true, hostingScope: 'same_vps', subdomain: '', customDomain: '',
      environment: 'staging', publicVisibility: true, monitoringEnabled: true, integrationEnabled: true,
      primaryUrl: '', sortOrder: 4,
    },
    {
      name: 'Jobs SA',
      slug: 'jobs-sa',
      category: 'Employment',
      shortDescription: 'South Africa-focused intelligent job matching platform connecting talent with opportunity.',
      longDescription: 'Jobs SA uses AI to match South African professionals with opportunities that align with their skills.',
      status: 'coming_soon', accessType: 'public', featured: false,
      hostedHere: false, hostingScope: 'external_domain', subdomain: '', customDomain: 'jobssa.co.za',
      environment: 'development', publicVisibility: true, monitoringEnabled: false, integrationEnabled: false,
      primaryUrl: '', sortOrder: 5,
    },
    {
      name: 'Kinship',
      slug: 'kinship',
      category: 'Social',
      shortDescription: 'Community-driven platform fostering meaningful connections and shared experiences.',
      longDescription: 'Kinship reimagines social connection for the modern era.',
      status: 'in_development', accessType: 'public', featured: false,
      hostedHere: true, hostingScope: 'same_vps', subdomain: '', customDomain: '',
      environment: 'development', publicVisibility: true, monitoringEnabled: false, integrationEnabled: false,
      primaryUrl: '', sortOrder: 6,
    },
    {
      name: 'Amarktai Secure',
      slug: 'amarktai-secure',
      category: 'Security',
      shortDescription: 'Enterprise-grade security platform for digital asset protection and threat intelligence.',
      longDescription: 'Amarktai Secure provides threat detection, zero-trust architecture, and AI-powered anomaly detection for digital platforms.',
      status: 'concept', accessType: 'private', featured: false,
      hostedHere: false, hostingScope: 'external_vps', subdomain: '', customDomain: '',
      environment: 'development', publicVisibility: true, monitoringEnabled: false, integrationEnabled: false,
      primaryUrl: '', sortOrder: 7,
    },
    {
      name: 'Crowd Lens',
      slug: 'crowd-lens',
      category: 'Media & AI',
      shortDescription: 'AI-powered crowd intelligence platform for real-time event analysis and social monitoring.',
      longDescription: 'Crowd Lens uses computer vision and NLP to analyze crowds, events, and social dynamics in real time.',
      status: 'concept', accessType: 'private', featured: false,
      hostedHere: false, hostingScope: 'external_vps', subdomain: '', customDomain: '',
      environment: 'development', publicVisibility: true, monitoringEnabled: false, integrationEnabled: false,
      primaryUrl: '', sortOrder: 8,
    },
  ]

  const createdProducts: Array<typeof products[0] & { id: number }> = []
  for (const p of products) {
    const prod = await prisma.product.upsert({
      where: { slug: p.slug },
      update: { ...p },
      create: { ...p },
    })
    createdProducts.push({ ...p, id: prod.id })
  }
  console.log(`✅ ${createdProducts.length} products seeded`)

  // ── Integrations ───────────────────────────────────────────────────
  const integratedProducts = createdProducts.filter(p => p.integrationEnabled)
  for (const prod of integratedProducts) {
    const existing = await prisma.appIntegration.findUnique({ where: { productId: prod.id } })
    if (!existing) {
      const isActive = prod.monitoringEnabled
      await prisma.appIntegration.create({
        data: {
          productId: prod.id,
          integrationToken: genToken(),
          heartbeatEnabled: true,
          metricsEnabled: true,
          eventsEnabled: true,
          vpsEnabled: isActive,
          lastHeartbeatAt: isActive ? new Date(Date.now() - Math.floor(Math.random() * 3 * 60 * 1000)) : null,
          healthStatus: isActive ? (Math.random() > 0.15 ? 'healthy' : 'degraded') : 'unknown',
          uptime: isActive ? parseFloat((99.5 + Math.random() * 0.49).toFixed(2)) : null,
          version: '1.0.0',
          environment: prod.environment,
        },
      })
    }
  }
  console.log('✅ Integrations seeded')

  // ── Metric Definitions ─────────────────────────────────────────────
  const metricDefs: Record<string, Array<{ key: string; label: string; type: string; chartType: string }>> = {
    'amarktai-crypto': [
      { key: 'active_users', label: 'Active Users', type: 'number', chartType: 'area' },
      { key: 'trades_per_hour', label: 'Trades / Hour', type: 'number', chartType: 'bar' },
      { key: 'signals_generated', label: 'Signals Generated', type: 'number', chartType: 'line' },
      { key: 'portfolio_value_usd', label: 'Portfolio Value (USD)', type: 'currency', chartType: 'area' },
    ],
    'amarktai-forex': [
      { key: 'active_traders', label: 'Active Traders', type: 'number', chartType: 'area' },
      { key: 'open_positions', label: 'Open Positions', type: 'number', chartType: 'bar' },
      { key: 'analysis_requests', label: 'Analysis Requests', type: 'number', chartType: 'line' },
      { key: 'avg_confidence', label: 'Avg AI Confidence %', type: 'percent', chartType: 'line' },
    ],
    'faith-haven': [
      { key: 'members', label: 'Members', type: 'number', chartType: 'area' },
      { key: 'daily_active', label: 'Daily Active', type: 'number', chartType: 'bar' },
    ],
    'learn-digital': [
      { key: 'enrolled_learners', label: 'Enrolled Learners', type: 'number', chartType: 'area' },
      { key: 'lessons_completed', label: 'Lessons Completed', type: 'number', chartType: 'bar' },
    ],
  }

  for (const prod of createdProducts) {
    const defs = metricDefs[prod.slug] ?? []
    for (let i = 0; i < defs.length; i++) {
      const def = defs[i]
      const existing = await prisma.appMetricDefinition.findFirst({ where: { productId: prod.id, metricKey: def.key } })
      if (!existing) {
        await prisma.appMetricDefinition.create({
          data: {
            productId: prod.id,
            metricKey: def.key,
            metricLabel: def.label,
            metricType: def.type,
            defaultChartType: def.chartType,
            isEnabled: true,
            sortOrder: i,
          },
        })
      }
    }
  }

  // ── Metric Points ──────────────────────────────────────────────────
  const cryptoProd = createdProducts.find(p => p.slug === 'amarktai-crypto')!
  const forexProd = createdProducts.find(p => p.slug === 'amarktai-forex')!
  const faithProd = createdProducts.find(p => p.slug === 'faith-haven')!
  const learnProd = createdProducts.find(p => p.slug === 'learn-digital')!

  const existingMetricCount = await prisma.appMetricPoint.count()
  if (existingMetricCount === 0) {
    await prisma.appMetricPoint.createMany({
      data: [
        ...genMetricPoints(cryptoProd.id, 'active_users', 48, 120, 350),
        ...genMetricPoints(cryptoProd.id, 'trades_per_hour', 48, 400, 1200),
        ...genMetricPoints(cryptoProd.id, 'signals_generated', 48, 80, 200),
        ...genMetricPoints(cryptoProd.id, 'portfolio_value_usd', 48, 2000000, 5000000),
        ...genMetricPoints(forexProd.id, 'active_traders', 48, 80, 220),
        ...genMetricPoints(forexProd.id, 'open_positions', 48, 150, 450),
        ...genMetricPoints(forexProd.id, 'analysis_requests', 48, 300, 900),
        ...genMetricPoints(forexProd.id, 'avg_confidence', 48, 78, 96),
        ...genMetricPoints(faithProd.id, 'members', 24, 800, 1200),
        ...genMetricPoints(faithProd.id, 'daily_active', 24, 80, 200),
        ...genMetricPoints(learnProd.id, 'enrolled_learners', 24, 300, 600),
        ...genMetricPoints(learnProd.id, 'lessons_completed', 24, 150, 400),
      ],
    })
    console.log('✅ Metric points seeded')
  }

  // ── VPS Snapshots ──────────────────────────────────────────────────
  const existingVpsCount = await prisma.vpsResourceSnapshot.count()
  if (existingVpsCount === 0) {
    for (const prod of [cryptoProd, forexProd, faithProd, learnProd]) {
      await prisma.vpsResourceSnapshot.createMany({ data: genVpsSnapshots(prod.id, 48) })
    }
    console.log('✅ VPS snapshots seeded')
  }

  // ── Events ─────────────────────────────────────────────────────────
  const eventTemplates = [
    { type: 'deployment', severity: 'info', title: 'New version deployed', message: 'v1.2.3 deployed successfully to production.' },
    { type: 'alert', severity: 'warning', title: 'High memory usage', message: 'RAM usage exceeded 85% threshold.' },
    { type: 'milestone', severity: 'info', title: 'User milestone reached', message: '1 000 active users milestone hit.' },
    { type: 'error', severity: 'error', title: 'API timeout detected', message: 'External API response exceeded 5 s.' },
    { type: 'health', severity: 'info', title: 'Health check passed', message: 'All services responding normally.' },
    { type: 'alert', severity: 'critical', title: 'CPU spike detected', message: 'CPU usage hit 95% for 2 minutes.' },
    { type: 'deployment', severity: 'info', title: 'Database migrated', message: 'Schema migration completed successfully.' },
    { type: 'security', severity: 'warning', title: 'Unusual login pattern', message: 'Multiple failed auth attempts detected.' },
  ]

  for (const prod of integratedProducts) {
    const existing = await prisma.appEvent.count({ where: { productId: prod.id } })
    if (existing === 0) {
      const count = 3 + Math.floor(Math.random() * 5)
      for (let i = 0; i < count; i++) {
        const tmpl = eventTemplates[Math.floor(Math.random() * eventTemplates.length)]
        await prisma.appEvent.create({
          data: {
            productId: prod.id,
            eventType: tmpl.type,
            severity: tmpl.severity,
            title: tmpl.title,
            message: tmpl.message,
            timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
          },
        })
      }
    }
  }
  console.log('✅ Events seeded')

  // ── Widget Configs ─────────────────────────────────────────────────
  const globalWidgets = [
    { widgetKey: 'network_overview', widgetType: 'stat_tile', sortOrder: 0 },
    { widgetKey: 'product_health_grid', widgetType: 'health_card', sortOrder: 1 },
    { widgetKey: 'recent_activity', widgetType: 'events_list', sortOrder: 2 },
    { widgetKey: 'contacts_chart', widgetType: 'area_chart', sortOrder: 3 },
    { widgetKey: 'vps_overview', widgetType: 'stat_tile', sortOrder: 4 },
  ]
  for (const w of globalWidgets) {
    const exists = await prisma.dashboardWidgetConfig.findFirst({ where: { widgetKey: w.widgetKey, productId: null } })
    if (!exists) {
      await prisma.dashboardWidgetConfig.create({ data: { ...w, isVisible: true, settingsJson: '{}' } })
    }
  }

  // ── Contacts & Waitlist ────────────────────────────────────────────
  const contacts = [
    { name: 'Sipho Ndlovu', email: 'sipho@example.com', companyOrProject: 'TechVentures SA', message: 'Interested in Amarktai Crypto integration for our platform.' },
    { name: 'Amara Diallo', email: 'amara@example.com', companyOrProject: 'FinEdge Ltd', message: 'We would like to discuss a partnership opportunity.' },
    { name: 'James Osei', email: 'james.osei@example.com', companyOrProject: '', message: 'Please add me to the Amarktai Forex waitlist.' },
  ]
  for (const c of contacts) {
    const exists = await prisma.contactSubmission.findFirst({ where: { email: c.email } })
    if (!exists) await prisma.contactSubmission.create({ data: c })
  }

  const waitlist = [
    { name: 'Zara Ahmed', email: 'zara@example.com', interest: 'Amarktai Crypto' },
    { name: 'Kwame Mensah', email: 'kwame@example.com', interest: 'Amarktai Forex' },
    { name: 'Aisha Kamara', email: 'aisha@example.com', interest: 'Learn Digital' },
    { name: 'Tendai Moyo', email: 'tendai@example.com', interest: 'Jobs SA' },
    { name: 'Olumide Bello', email: 'olumide@example.com', interest: 'Amarktai Crypto' },
  ]
  for (const w of waitlist) {
    const exists = await prisma.waitlistEntry.findFirst({ where: { email: w.email } })
    if (!exists) await prisma.waitlistEntry.create({ data: w })
  }
  console.log('✅ Contacts & waitlist seeded')

  // ── API Keys ───────────────────────────────────────────────────────
  const apiKeys = [
    { provider: 'OpenAI', label: 'GPT-4 Production', apiKey: 'sk-prod-••••••••••••••••••••', isActive: true },
    { provider: 'Anthropic', label: 'Claude API', apiKey: 'sk-ant-••••••••••••••••', isActive: true },
    { provider: 'Coinbase', label: 'Crypto Data Feed', apiKey: 'cb_••••••••••••••••••••', isActive: false },
  ]
  for (const k of apiKeys) {
    const exists = await prisma.apiKey.findFirst({ where: { provider: k.provider, label: k.label } })
    if (!exists) await prisma.apiKey.create({ data: k })
  }
  console.log('✅ API keys seeded')

  console.log('\n✨ Seeding complete!')
  console.log('   Admin login: admin@amarktai.com / admin123!')
  console.log('   Dashboard:   /admin/login')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
