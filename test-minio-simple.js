/**
 * Simple MinIO Connection Test
 */

import 'dotenv/config';
import { Client } from 'minio';

const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT,
    port: parseInt(process.env.MINIO_PORT),
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY,
    secretKey: process.env.MINIO_SECRET_KEY
});

console.log('🔧 Testing MinIO Connection...\n');
console.log(`Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
console.log(`SSL: ${process.env.MINIO_USE_SSL}`);
console.log(`Access Key: ${process.env.MINIO_ACCESS_KEY?.substring(0, 10)}...\n`);

// Test 1: List buckets
console.log('1️⃣  Listing buckets...');
try {
    const buckets = await minioClient.listBuckets();
    console.log('✅ Connected successfully!');
    console.log(`📦 Found ${buckets.length} bucket(s):`);
    buckets.forEach(bucket => {
        console.log(`   - ${bucket.name} (created: ${bucket.creationDate})`);
    });
    
    if (buckets.length === 0) {
        console.log('\n⚠️  No buckets found. You may need to create them manually.');
        console.log('   Required buckets: payments, permissions, faces, attendance');
    }
} catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('   - Credentials are invalid');
    console.log('   - MinIO server is not accessible');
    console.log('   - Firewall blocking connection');
}
