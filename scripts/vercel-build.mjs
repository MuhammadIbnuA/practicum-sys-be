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

async function checkRequiredTables() {
    console.log('\n🔍 Checking required tables...');
    try {
        const requiredTables = [
            'users', 'semesters', 'courses', 'time_slots', 'rooms', 
            'classes', 'class_assistants', 'class_sessions', 'enrollments',
            'student_attendances', 'assistant_attendances', 'permission_requests',
            'payments'
        ];
        
        const result = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE'
        `;
        
        const existingTables = result.map(r => r.table_name);
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));
        
        if (missingTables.length === 0) {
            console.log('✅ All required tables exist');
            return { allExist: true, missing: [] };
        } else {
            console.error(`❌ Missing tables: ${missingTables.join(', ')}`);
            return { allExist: false, missing: missingTables };
        }
    } catch (error) {
        console.error('❌ Failed to check tables:', error.message);
        return { allExist: false, missing: [] };
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
            return false;
        }
    } catch (error) {
        console.error('❌ Failed to check NIM column:', error.message);
        return false;
    }
}

async function addNimColumnManually() {
    console.log('\n🔧 Attempting to add NIM column manually...');
    try {
        // Add nim column if it doesn't exist
        await prisma.$executeRawUnsafe(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS nim TEXT;
        `);
        console.log('✅ NIM column added');

        // Add unique constraint
        await prisma.$executeRawUnsafe(`
            DO $$ 
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint 
                    WHERE conname = 'users_nim_key'
                ) THEN
                    ALTER TABLE users ADD CONSTRAINT users_nim_key UNIQUE (nim);
                END IF;
            END $$;
        `);
        console.log('✅ NIM unique constraint added');

        // Add index
        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS users_nim_idx ON users(nim);
        `);
        console.log('✅ NIM index added');

        return true;
    } catch (error) {
        console.error('❌ Failed to add NIM column:', error.message);
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

        // Step 3: Check if tables exist
        const { allExist, missing } = await checkRequiredTables();
        
        if (!allExist) {
            console.log(`\n⚠️  Missing ${missing.length} tables, running migrations...`);
            
            // Try migrate deploy first (uses existing migrations)
            try {
                exec('npx prisma migrate deploy', 'Apply migrations');
            } catch (error) {
                console.log('⚠️  Migrate deploy failed, trying db push with force reset...');
                // If migrations fail, force reset and recreate
                exec('npx prisma db push --force-reset --skip-generate --accept-data-loss', 'Force reset and push schema');
            }
            
            // Verify tables were created
            const { allExist: tablesCreated } = await checkRequiredTables();
            if (!tablesCreated) {
                throw new Error('Failed to create required tables');
            }
        } else {
            // Tables exist, just sync schema
            try {
                exec('npx prisma db push --skip-generate --accept-data-loss', 'Sync schema to database');
            } catch (error) {
                console.log('⚠️  Schema sync failed, continuing...');
            }
        }

        // Step 4: Check if NIM column exists
        let hasNim = await checkNimColumn();
        
        // Step 5: If NIM column doesn't exist, add it manually
        if (!hasNim) {
            console.log('\n⚠️  NIM column missing, adding manually...');
            const added = await addNimColumnManually();
            if (!added) {
                throw new Error('Failed to add NIM column');
            }
            
            // Verify again
            hasNim = await checkNimColumn();
            if (!hasNim) {
                throw new Error('NIM column still missing after manual addition');
            }
        }

        // Step 6: Seed database
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
