import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log('\n=== DATABASE SCHEMA CHECK ===\n');
        
        // Check if nim column exists
        const result = await prisma.$queryRaw`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `;
        
        console.log('Columns in users table:');
        result.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
        
        const hasNim = result.some(col => col.column_name === 'nim');
        console.log(`\n✓ NIM column exists: ${hasNim ? 'YES ✅' : 'NO ❌'}`);
        
        if (!hasNim) {
            console.log('\n⚠️  WARNING: NIM column is missing from the database!');
            console.log('   This will cause seed script to fail.');
            console.log('\n   Solution: Run "prisma db push --force-reset" to recreate tables');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
