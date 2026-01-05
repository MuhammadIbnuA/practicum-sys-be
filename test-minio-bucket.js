/**
 * Test MinIO Bucket Access
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

console.log('🔧 Testing MinIO Bucket Access...\n');

const testBuckets = ['payments', 'permissions', 'faces', 'attendance'];

for (const bucketName of testBuckets) {
    try {
        console.log(`Testing bucket: ${bucketName}`);
        const exists = await minioClient.bucketExists(bucketName);
        console.log(`  ✅ Bucket exists: ${exists}\n`);
        
        if (exists) {
            // Try to list objects
            try {
                const stream = minioClient.listObjects(bucketName, '', true);
                let count = 0;
                for await (const obj of stream) {
                    count++;
                }
                console.log(`  📁 Objects in bucket: ${count}\n`);
            } catch (listError) {
                console.log(`  ⚠️  Cannot list objects: ${listError.message}\n`);
            }
        }
    } catch (error) {
        console.log(`  ❌ Error: ${error.message}\n`);
    }
}

console.log('\n💡 Summary:');
console.log('If buckets exist but you cannot upload, the service account may need write permissions.');
console.log('If buckets do not exist, you may need to create them manually or grant create permissions.');
