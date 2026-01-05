#!/usr/bin/env node

/**
 * Script to apply Prisma migrations to production database
 * Run this to ensure all migrations are applied to Supabase
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';

dotenv.config();

console.log('🔄 Applying Prisma migrations to production database...\n');

try {
  // Step 1: Generate Prisma Client
  console.log('1️⃣  Generating Prisma Client...');
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Prisma Client generated\n');

  // Step 2: Apply migrations
  console.log('2️⃣  Applying migrations to database...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('✅ Migrations applied\n');

  // Step 3: Verify schema
  console.log('3️⃣  Verifying database schema...');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('✅ Database schema verified\n');

  console.log('🎉 All migrations applied successfully!');
  console.log('\nNext steps:');
  console.log('1. Seed the database: npm run db:seed');
  console.log('2. Test the API endpoints');
  console.log('3. Deploy to Vercel');

} catch (error) {
  console.error('❌ Error applying migrations:', error.message);
  process.exit(1);
}
