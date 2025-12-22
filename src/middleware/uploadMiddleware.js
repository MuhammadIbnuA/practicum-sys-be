/**
 * File Upload Middleware
 * Uses memory storage for serverless deployment (stores as base64 in DB)
 */

import multer from 'multer';

// Configure memory storage (for serverless - no filesystem)
const storage = multer.memoryStorage();

// File filter - allow common document and image types
const fileFilter = (req, file, cb) => {
    const allowedMimeTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed types: PDF, JPEG, PNG, DOC, DOCX'), false);
    }
};

// Configure multer with memory storage
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max
    }
});

/**
 * Single file upload middleware for permission letters
 */
export const uploadPermissionLetter = upload.single('file');

/**
 * Convert uploaded file to base64
 * Call this after uploadPermissionLetter middleware
 */
export const convertToBase64 = (req, res, next) => {
    if (req.file) {
        // Convert buffer to base64
        req.file.base64 = req.file.buffer.toString('base64');
        req.file.dataUrl = `data:${req.file.mimetype};base64,${req.file.base64}`;
    }
    next();
};

/**
 * Error handler for multer errors
 */
export const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File too large. Maximum size is 5MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `Upload error: ${err.message}`
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
};

export default { uploadPermissionLetter, convertToBase64, handleUploadError };
