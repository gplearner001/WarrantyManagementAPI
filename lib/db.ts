import { PrismaClient, Prisma } from '@prisma/client';
import logger from './logger';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prismaOptions: Prisma.PrismaClientOptions = {
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' }
  ],
};

const prisma = global.prisma || new PrismaClient(prismaOptions);

// Type-safe event handlers
prisma.$on('query' as never, (e: Prisma.QueryEvent) => {
  logger.debug(e);
});

prisma.$on('error' as never, (e: Prisma.LogEvent) => {
  logger.error(e);
});

prisma.$on('warn' as never, (e: Prisma.LogEvent) => {
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

export async function transaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
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