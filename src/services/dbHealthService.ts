import { prisma } from '../config/prisma.js'

export async function checkDbHealth(): Promise<{ status: string }> {
  await prisma.$queryRaw`SELECT 1`
  return { status: 'ok' }
}
