import 'dotenv/config';
import prisma from './lib/prisma';

export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[LuminaFM] Database connection established successfully.');
    return true;
  } catch (error) {
    console.error('[LuminaFM] Database connection check failed:', error);
    return false;
  }
}

export * from './lib/prisma';
export * from './tenant';
export default prisma;
