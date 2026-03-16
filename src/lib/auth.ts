import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export async function verifyAdminCredentials(email: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { email } })
  if (!admin) return null
  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) return null
  return admin
}

export async function createAdminUser(email: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 12)
  return prisma.adminUser.create({
    data: { email, passwordHash },
  })
}
