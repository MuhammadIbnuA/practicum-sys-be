import { execSync } from 'child_process';

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

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 VERCEL BUILD PROCESS');
    console.log('='.repeat(60));

    try {
        // Step 1: Generate Prisma Client
        exec('npx prisma generate', 'Generate Prisma Client');

        // Step 2: Reset database (drops all, applies migrations, runs seed)
        // This is the cleanest approach - one command does everything
        exec('npx prisma migrate reset --force', 'Reset database and seed');

        console.log('\n' + '='.repeat(60));
        console.log('✅ BUILD COMPLETE!');
        console.log('='.repeat(60) + '\n');

    } catch (error) {
        console.error('\n' + '='.repeat(60));
        console.error('❌ BUILD FAILED!');
        console.error('='.repeat(60));
        console.error('\nError:', error.message);
        process.exit(1);
    }
}

main();
