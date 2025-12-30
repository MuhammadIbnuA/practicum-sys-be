/**
 * Prisma Client Singleton for Serverless
 * Prevents "Too many database connections" errors on Vercel
 * Optimized for Vercel Postgres with connection pooling
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

const prismaClientSingleton = () => {
    return new PrismaClient({
        // Logging configuration
        log: process.env.NODE_ENV === 'development' 
            ? ['query', 'error', 'warn'] 
            : ['error'],
        // Connection management
        errorFormat: 'pretty',
    });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

// Graceful shutdown
process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
});

export default prisma;
