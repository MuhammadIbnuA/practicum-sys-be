#!/bin/bash
set -e

echo "================================"
echo "Starting Build Process"
echo "================================"

echo ""
echo "Step 1: Generating Prisma Client..."
npx prisma generate

echo ""
echo "Step 2: Checking database connection..."
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$connect().then(() => { console.log('✓ Database connected'); prisma.\$disconnect(); }).catch(e => { console.error('✗ Database connection failed:', e.message); process.exit(1); });"

echo ""
echo "Step 3: Pushing schema to database..."
npx prisma db push --skip-generate --accept-data-loss --force-reset

echo ""
echo "Step 4: Verifying schema..."
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.\$queryRaw\`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'nim'\`.then(r => { if (r.length > 0) { console.log('✓ NIM column exists'); } else { console.error('✗ NIM column missing!'); process.exit(1); } prisma.\$disconnect(); });"

echo ""
echo "Step 5: Seeding database..."
npm run db:seed

echo ""
echo "================================"
echo "Build Complete!"
echo "================================"
