import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function dropPayments() {
    try {
        console.log('Dropping payments table to simulate Vercel scenario...');
        await prisma.$executeRawUnsafe('DROP TABLE IF EXISTS payments CASCADE;');
        console.log('✅ Payments table dropped');
        
        // Check tables
        const result = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
            ORDER BY table_name
        `;
        
        console.log('\nRemaining tables:');
        result.forEach(r => console.log(`  - ${r.table_name}`));
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

dropPayments();
