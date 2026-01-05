import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyAdmin, verifyAssistantContext } from '../middleware/roleMiddleware.js';
import {
    getClassGrades,
    updateGrade,
    updateSessionGrades,
    getSessionGrades,
    getClassGradeStats
} from '../controllers/gradeController.js';

const router = express.Router();

// Middleware to check if user is admin or assistant for the class
const requireTeachingAccess = async (req, res, next) => {
    if (req.user.is_admin) {
        return next(); // Admin has access to all classes
    }
    // For non-admin, verify assistant context
    return verifyAssistantContext(req, res, next);
};

// All routes require authentication
router.use(verifyToken);

// Get class grading data (for grading table)
// Accessible by admin or class assistant
router.get('/class/:classId', requireTeachingAccess, getClassGrades);

// Get session grading data
router.get('/session/:sessionId', verifyToken, getSessionGrades);

// Update single grade
router.put('/update', verifyToken, updateGrade);

// Batch update grades for a session
router.put('/session/:sessionId/batch', verifyToken, updateSessionGrades);

// Get grade statistics for a class
router.get('/class/:classId/stats', requireTeachingAccess, getClassGradeStats);

export default router;
