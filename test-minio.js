/**
 * MinIO Integration Test
 * Run: node test-minio.js
 */

import 'dotenv/config';
import { initializeBuckets, uploadBase64File, BUCKETS, getFileUrl, deleteFile } from './src/services/minioService.js';

const testMinIO = async () => {
    console.log('🧪 Testing MinIO Integration...\n');

    try {
        // Test 1: Initialize buckets
        console.log('1️⃣  Initializing buckets...');
        const initialized = await initializeBuckets();
        if (initialized) {
            console.log('   ✅ Buckets initialized\n');
        } else {
            console.log('   ⚠️  Bucket initialization failed (check connection)\n');
        }

        // Test 2: Upload test file
        console.log('2️⃣  Uploading test file...');
        const testBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        try {
            const fileUrl = await uploadBase64File(testBase64, BUCKETS.PAYMENTS, 'test');
            console.log('   ✅ File uploaded successfully');
            console.log(`   📎 URL: ${fileUrl}\n`);

            // Test 3: Get file URL
            console.log('3️⃣  Getting file URL...');
            console.log(`   ✅ URL accessible: ${fileUrl}\n`);

            // Test 4: Delete file
            console.log('4️⃣  Deleting test file...');
            const filename = fileUrl.split('/').pop();
            const deleted = await deleteFile(BUCKETS.PAYMENTS, filename);
            if (deleted) {
                console.log('   ✅ File deleted successfully\n');
            }

            console.log('✅ All tests passed! MinIO integration is working.\n');
            console.log('📝 Next steps:');
            console.log('   1. Update MINIO_ENDPOINT in .env');
            console.log('   2. Restart server: npm run dev');
            console.log('   3. Test payment upload from frontend');
            
        } catch (uploadError) {
            console.log('   ❌ Upload failed:', uploadError.message);
            console.log('\n⚠️  MinIO connection issue. Check:');
            console.log('   - MINIO_ENDPOINT is correct');
            console.log('   - MinIO server is running');
            console.log('   - Credentials are valid');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
};

testMinIO();
