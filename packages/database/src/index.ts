import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __foodPrisma: PrismaClient | undefined;
}

export const prisma: PrismaClient =
  global.__foodPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.__foodPrisma = prisma;
}

export * from '@prisma/client';
