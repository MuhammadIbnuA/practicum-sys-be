/**
 * MinIO Service
 * Handles file uploads to MinIO object storage
 */

import { Client } from 'minio';
import crypto from 'crypto';

// MinIO Configuration
const minioClient = new Client({
    endPoint: process.env.MINIO_ENDPOINT || 'your-minio-server.com',
    port: parseInt(process.env.MINIO_PORT) || 9000,
    useSSL: process.env.MINIO_USE_SSL === 'true',
    accessKey: process.env.MINIO_ACCESS_KEY || 'NBGVSD4PD2OKEDNIC0CD',
    secretKey: process.env.MINIO_SECRET_KEY || 'J6vss1VUXMusUUniOWY2dbSYhQ5VEJ9H+E2Jojhm'
});

// Bucket names
const BUCKETS = {
    PAYMENTS: 'payments',
    PERMISSIONS: 'permissions',
    FACES: 'faces',
    ATTENDANCE: 'attendance'
};

/**
 * Initialize MinIO buckets
 */
export const initializeBuckets = async () => {
    try {
        for (const bucket of Object.values(BUCKETS)) {
            const exists = await minioClient.bucketExists(bucket);
            if (!exists) {
                await minioClient.makeBucket(bucket, 'us-east-1');
                console.log(`✓ Created MinIO bucket: ${bucket}`);
                
                // Set public read policy for easier access (optional)
                const policy = {
                    Version: '2012-10-17',
                    Statement: [{
                        Effect: 'Allow',
                        Principal: { AWS: ['*'] },
                        Action: ['s3:GetObject'],
                        Resource: [`arn:aws:s3:::${bucket}/*`]
                    }]
                };
                await minioClient.setBucketPolicy(bucket, JSON.stringify(policy));
            }
        }
        console.log('✓ MinIO buckets initialized');
        return true;
    } catch (error) {
        console.error('MinIO initialization error:', error);
        return false;
    }
};

/**
 * Upload base64 file to MinIO
 * @param {string} base64Data - Base64 encoded file (with data:image/jpeg;base64, prefix)
 * @param {string} bucket - Bucket name
 * @param {string} prefix - File prefix (e.g., 'user-123')
 * @returns {Promise<string>} - File URL
 */
export const uploadBase64File = async (base64Data, bucket, prefix = '') => {
    try {
        // Extract mime type and base64 content
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
            throw new Error('Invalid base64 format');
        }

        const mimeType = matches[1];
        const base64Content = matches[2];
        const buffer = Buffer.from(base64Content, 'base64');

        // Generate unique filename
        const extension = mimeType.split('/')[1] || 'bin';
        const filename = `${prefix}-${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;

        // Upload to MinIO
        await minioClient.putObject(bucket, filename, buffer, buffer.length, {
            'Content-Type': mimeType
        });

        // Return URL
        const url = await getFileUrl(bucket, filename);
        return url;
    } catch (error) {
        console.error('MinIO upload error:', error);
        throw new Error('Failed to upload file to storage');
    }
};

/**
 * Upload multiple base64 files
 * @param {string[]} base64Files - Array of base64 encoded files
 * @param {string} bucket - Bucket name
 * @param {string} prefix - File prefix
 * @returns {Promise<string[]>} - Array of file URLs
 */
export const uploadMultipleBase64Files = async (base64Files, bucket, prefix = '') => {
    try {
        const uploadPromises = base64Files.map(file => uploadBase64File(file, bucket, prefix));
        return await Promise.all(uploadPromises);
    } catch (error) {
        console.error('MinIO multiple upload error:', error);
        throw new Error('Failed to upload files to storage');
    }
};

/**
 * Get file URL (presigned or public)
 * @param {string} bucket - Bucket name
 * @param {string} filename - File name
 * @param {number} expiry - Expiry in seconds (default 7 days)
 * @returns {Promise<string>} - File URL
 */
export const getFileUrl = async (bucket, filename, expiry = 7 * 24 * 60 * 60) => {
    try {
        // For public buckets, return direct URL
        const endpoint = process.env.MINIO_ENDPOINT || 'your-minio-server.com';
        const port = process.env.MINIO_PORT || 9000;
        const protocol = process.env.MINIO_USE_SSL === 'true' ? 'https' : 'http';
        
        // If using public policy, return direct URL
        if (process.env.MINIO_PUBLIC_ACCESS === 'true') {
            return `${protocol}://${endpoint}:${port}/${bucket}/${filename}`;
        }
        
        // Otherwise, return presigned URL
        return await minioClient.presignedGetObject(bucket, filename, expiry);
    } catch (error) {
        console.error('MinIO get URL error:', error);
        throw new Error('Failed to get file URL');
    }
};

/**
 * Delete file from MinIO
 * @param {string} bucket - Bucket name
 * @param {string} filename - File name
 */
export const deleteFile = async (bucket, filename) => {
    try {
        await minioClient.removeObject(bucket, filename);
        return true;
    } catch (error) {
        console.error('MinIO delete error:', error);
        return false;
    }
};

/**
 * Delete multiple files
 * @param {string} bucket - Bucket name
 * @param {string[]} filenames - Array of file names
 */
export const deleteMultipleFiles = async (bucket, filenames) => {
    try {
        const deletePromises = filenames.map(filename => deleteFile(bucket, filename));
        await Promise.all(deletePromises);
        return true;
    } catch (error) {
        console.error('MinIO multiple delete error:', error);
        return false;
    }
};

/**
 * Extract filename from MinIO URL
 * @param {string} url - MinIO URL
 * @returns {string} - Filename
 */
export const extractFilenameFromUrl = (url) => {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        return pathParts[pathParts.length - 1];
    } catch (error) {
        return null;
    }
};

/**
 * Extract bucket and filename from MinIO URL
 * @param {string} url - MinIO URL
 * @returns {object} - { bucket, filename }
 */
export const parseMinioUrl = (url) => {
    try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/').filter(p => p);
        return {
            bucket: pathParts[0],
            filename: pathParts.slice(1).join('/')
        };
    } catch (error) {
        return null;
    }
};

export default {
    BUCKETS,
    initializeBuckets,
    uploadBase64File,
    uploadMultipleBase64Files,
    getFileUrl,
    deleteFile,
    deleteMultipleFiles,
    extractFilenameFromUrl,
    parseMinioUrl
};
