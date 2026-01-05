/**
 * File Controller
 * Handles file preview and download from MinIO
 */

import { apiResponse } from '../utils/helpers.js';

/**
 * Preview file (returns file URL or base64)
 * GET /api/files/preview?url=<file_url>
 */
export const previewFile = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return apiResponse.error(res, 'File URL is required.', 400);
        }

        // If it's already a base64 data URL, return it
        if (url.startsWith('data:')) {
            return apiResponse.success(res, { 
                type: 'base64',
                url,
                isBase64: true
            }, 'File preview data.');
        }

        // If it's a MinIO URL, return it (browser can access directly)
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return apiResponse.success(res, {
                type: 'url',
                url,
                isBase64: false
            }, 'File preview URL.');
        }

        return apiResponse.error(res, 'Invalid file URL format.', 400);
    } catch (error) {
        console.error('Preview file error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get file info
 * GET /api/files/info?url=<file_url>
 */
export const getFileInfo = async (req, res) => {
    try {
        const { url } = req.query;

        if (!url) {
            return apiResponse.error(res, 'File URL is required.', 400);
        }

        let fileInfo = {
            url,
            isBase64: url.startsWith('data:'),
            isMinIO: url.startsWith('http://') || url.startsWith('https://'),
            mimeType: null,
            size: null
        };

        if (fileInfo.isBase64) {
            // Extract mime type from base64 data URL
            const matches = url.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches) {
                fileInfo.mimeType = matches[1];
                fileInfo.size = Math.ceil((matches[2].length * 3) / 4); // Approximate size
            }
        } else if (fileInfo.isMinIO) {
            // Extract mime type from URL extension
            const extension = url.split('.').pop().toLowerCase();
            const mimeTypes = {
                'jpg': 'image/jpeg',
                'jpeg': 'image/jpeg',
                'png': 'image/png',
                'gif': 'image/gif',
                'pdf': 'application/pdf',
                'doc': 'application/msword',
                'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            fileInfo.mimeType = mimeTypes[extension] || 'application/octet-stream';
        }

        return apiResponse.success(res, fileInfo, 'File info retrieved.');
    } catch (error) {
        console.error('Get file info error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

export default {
    previewFile,
    getFileInfo
};
