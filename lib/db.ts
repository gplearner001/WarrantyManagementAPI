import { PrismaClient } from '@prisma/client';
import logger from './logger';

declare global {
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error', 'warn'].map(level => ({
    emit: 'event',
    level,
  })),
});

prisma.$on('query', (e: any) => {
  logger.debug(e);
});

prisma.$on('error', (e: any) => {
  logger.error(e);
});

prisma.$on('warn', (e: any) => {
  logger.warn(e);
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

export async function query<T>(text: string, params?: any[]): Promise<T[]> {
  try {
    const result = await prisma.$queryRawUnsafe<T[]>(text, ...(params || []));
    return result;
  } catch (error) {
    logger.error({ error, query: text, params }, 'Database query error');
    throw error;
  }
}

export async function transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  try {
    return await prisma.$transaction(async (tx) => {
      return await callback(tx);
    });
  } catch (error) {
    throw error;
  }
}

export async function healthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}