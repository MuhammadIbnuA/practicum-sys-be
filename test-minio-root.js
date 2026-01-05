/**
 * Test MinIO with Root Credentials
 * This helps diagnose if the issue is with service account or MinIO server
 */

import 'dotenv/config';
import { Client } from 'minio';

console.log('🔧 Testing MinIO Connection...\n');
console.log('Current credentials from .env:');
console.log(`  Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
console.log(`  SSL: ${process.env.MINIO_USE_SSL}`);
console.log(`  Access Key: ${process.env.MINIO_ACCESS_KEY?.substring(0, 10)}...`);
console.log('');

// Test with current credentials
const testConnection = async (accessKey, secretKey, label) => {
    console.log(`\n📝 Testing with ${label}...`);
    
    const client = new Client({
        endPoint: process.env.MINIO_ENDPOINT,
        port: parseInt(process.env.MINIO_PORT),
        useSSL: process.env.MINIO_USE_SSL === 'true',
        accessKey,
        secretKey
    });

    try {
        // Test 1: List buckets
        console.log('  1️⃣  Listing buckets...');
        const buckets = await client.listBuckets();
        console.log(`     ✅ Success! Found ${buckets.length} bucket(s):`);
        buckets.forEach(b => console.log(`        - ${b.name}`));
        
        // Test 2: Check if our buckets exist
        console.log('\n  2️⃣  Checking required buckets...');
        const required = ['payments', 'permissions', 'faces', 'attendance'];
        for (const bucket of required) {
            try {
                const exists = await client.bucketExists(bucket);
                if (exists) {
                    console.log(`     ✅ ${bucket} exists`);
                } else {
                    console.log(`     ⚠️  ${bucket} does not exist (needs to be created)`);
                }
            } catch (err) {
                console.log(`     ❌ ${bucket} - ${err.message}`);
            }
        }
        
        return true;
    } catch (error) {
        console.log(`     ❌ Failed: ${error.message}`);
        return false;
    }
};

// Test with credentials from .env
await testConnection(
    process.env.MINIO_ACCESS_KEY,
    process.env.MINIO_SECRET_KEY,
    'Service Account from .env'
);

console.log('\n\n' + '='.repeat(60));
console.log('💡 Troubleshooting Guide:');
console.log('='.repeat(60));
console.log('\nIf connection failed:');
console.log('1. Verify MinIO server is running:');
console.log('   ssh root@your-server');
console.log('   docker ps | grep minio');
console.log('');
console.log('2. Check if buckets exist on server:');
console.log('   docker exec -it minio mc ls local/');
console.log('');
console.log('3. Create buckets manually:');
console.log('   docker exec -it minio mc mb local/payments');
console.log('   docker exec -it minio mc mb local/permissions');
console.log('   docker exec -it minio mc mb local/faces');
console.log('   docker exec -it minio mc mb local/attendance');
console.log('');
console.log('4. Set public read policy:');
console.log('   docker exec -it minio mc anonymous set download local/payments');
console.log('   docker exec -it minio mc anonymous set download local/permissions');
console.log('   docker exec -it minio mc anonymous set download local/faces');
console.log('   docker exec -it minio mc anonymous set download local/attendance');
console.log('');
console.log('5. Verify service account has permissions:');
console.log('   docker exec -it minio mc admin user svcacct info local ' + process.env.MINIO_ACCESS_KEY);
console.log('');
console.log('6. If needed, create new service account:');
console.log('   docker exec -it minio mc admin user svcacct add local apollo1');
console.log('   Then update MINIO_ACCESS_KEY and MINIO_SECRET_KEY in .env');
console.log('');
