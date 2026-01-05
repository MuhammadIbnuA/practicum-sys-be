/**
 * Create MinIO Buckets Script
 * Run: node create-buckets.js
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

const buckets = ['payments', 'permissions', 'faces', 'attendance'];

const createBuckets = async () => {
    console.log('🔧 Creating MinIO Buckets...\n');
    console.log(`Endpoint: ${process.env.MINIO_ENDPOINT}:${process.env.MINIO_PORT}`);
    console.log(`SSL: ${process.env.MINIO_USE_SSL}\n`);

    for (const bucketName of buckets) {
        try {
            const exists = await minioClient.bucketExists(bucketName);
            
            if (exists) {
                console.log(`✅ Bucket '${bucketName}' already exists`);
            } else {
                await minioClient.makeBucket(bucketName, 'us-east-1');
                console.log(`✅ Created bucket '${bucketName}'`);
                
                // Set public read policy
                const policy = {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucketName}/*`]
                    }]
                };
                
                await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
                console.log(`   📖 Set public read policy for '${bucketName}'`);
            }
        } catch (error) {
            console.log(`❌ Error with bucket '${bucketName}': ${error.message}`);
        }
    }

    console.log('\n✅ Bucket creation complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Test connection: node test-minio-simple.js');
    console.log('   2. Test upload: node test-minio.js');
    console.log('   3. Start server: npm run dev');
};

createBuckets().catch(console.error);
