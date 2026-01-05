/**
 * Face Recognition Routes
 * /api/student/face/* - Student face registration
 * /api/teaching/face/* - Teaching face recognition
 * /api/admin/face/* - Admin face management
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    uploadFaceImages,
    saveFaceDescriptors,
    getFaceStatus,
    deleteFaceData,
    getSessionFaceDescriptors,
    markFaceAttendance,
    getFaceStats,
    getStudentsWithFaceData,
    getFaceAttendanceLogs
} from '../controllers/faceController.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Student routes
router.post('/student/face/upload', uploadFaceImages);
router.post('/student/face/save-descriptors', saveFaceDescriptors);
router.get('/student/face/status', getFaceStatus);
router.delete('/student/face/delete', deleteFaceData);

// Teaching routes
router.get('/teaching/session/:sessionId/face-descriptors', getSessionFaceDescriptors);
router.post('/teaching/face/attendance', markFaceAttendance);

// Admin routes (TODO: add admin check)
router.get('/admin/face/stats', getFaceStats);
router.get('/admin/face/students', getStudentsWithFaceData);
router.get('/admin/face/logs', getFaceAttendanceLogs);

export default router;
