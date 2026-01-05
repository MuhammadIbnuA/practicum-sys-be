import express from 'express';
import { previewFile, getFileInfo } from '../controllers/fileController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// All file routes require authentication
router.use(verifyToken);

// Preview file
router.get('/preview', previewFile);

// Get file info
router.get('/info', getFileInfo);

export default router;
