import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function exec(command, description) {
    console.log(`\n📦 ${description}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log(`✅ ${description} - SUCCESS`);
        return true;
    } catch (error) {
        console.error(`❌ ${description} - FAILED`);
        throw error;
    }
}

async function checkNimColumn() {
    console.log('\n🔍 Checking if NIM column exists...');
    try {
        const result = await prisma.$queryRaw`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = 'nim'
        `;
        
        if (result.length > 0) {
            console.log('✅ NIM column exists in database');
            return true;
        } else {
            console.error('❌ NIM column MISSING from database!');
            console.error('   This will cause seed script to fail.');
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to check NIM column:', error.message);
        return false;
    }
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 VERCEL BUILD PROCESS');
    console.log('='.repeat(60));

    try {
        // Step 1: Generate Prisma Client
        exec('npx prisma generate', 'Generate Prisma Client');

        // Step 2: Test database connection
        console.log('\n🔌 Testing database connection...');
        await prisma.$connect();
        console.log('✅ Database connected successfully');

        // Step 3: Push schema to database (with force reset to ensure nim column is added)
        exec('npx prisma db push --skip-generate --accept-data-loss --force-reset', 'Push schema to database');

        // Step 4: Verify NIM column exists
        const hasNim = await checkNimColumn();
        if (!hasNim) {
            throw new Error('NIM column verification failed');
        }

        // Step 5: Seed database
        exec('node prisma/seed.js', 'Seed database');

        console.log('\n' + '='.repeat(60));
        console.log('✅ BUILD COMPLETE!');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ BUILD FAILED!');
        console.error('='.repeat(60));
        console.error('\nError:', error.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
