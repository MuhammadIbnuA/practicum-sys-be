import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTables() {
    try {
        console.log('\n=== DATABASE TABLES CHECK ===\n');
        
        // Check what schemas exist
        const schemas = await prisma.$queryRaw`
            SELECT schema_name 
            FROM information_schema.schemata
            WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
            ORDER BY schema_name;
        `;
        
        console.log('Available schemas:');
        schemas.forEach(s => console.log(`  - ${s.schema_name}`));
        
        // Check tables in public schema
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `;
        
        console.log('\nTables in public schema:');
        tables.forEach(t => console.log(`  - ${t.table_name}`));
        
        // Check if our users table exists
        const hasUsers = tables.some(t => t.table_name === 'users');
        console.log(`\n✓ users table exists: ${hasUsers ? 'YES' : 'NO'}`);
        
        if (hasUsers) {
            // Check columns in users table
            const columns = await prisma.$queryRaw`
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_schema = 'public'
                AND table_name = 'users'
                ORDER BY ordinal_position;
            `;
            
            console.log('\nColumns in public.users:');
            columns.forEach(col => {
                console.log(`  - ${col.column_name} (${col.data_type})`);
            });
            
            const hasNim = columns.some(col => col.column_name === 'nim');
            const hasEmail = columns.some(col => col.column_name === 'email');
            const hasPassword = columns.some(col => col.column_name === 'password');
            
            console.log(`\n✓ Has nim: ${hasNim ? 'YES ✅' : 'NO ❌'}`);
            console.log(`✓ Has email: ${hasEmail ? 'YES ✅' : 'NO ❌'}`);
            console.log(`✓ Has password: ${hasPassword ? 'YES ✅' : 'NO ❌'}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkTables();
