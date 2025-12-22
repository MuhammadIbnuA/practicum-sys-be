/**
 * Teaching Routes
 * /api/teaching/*
 * All routes require verifyToken + assistant context verification
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyAssistantContext, verifyAssistantForSession } from '../middleware/roleMiddleware.js';
import {
    getSchedule,
    checkIn,
    getPendingAttendance,
    approveAttendance,
    rejectAttendance,
    getSessionRoster,
    updateBatchAttendance,
    getClassSessions
} from '../controllers/teachingController.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// =============================================================================
// SCHEDULE
// =============================================================================

/**
 * @route   GET /api/teaching/schedule
 * @desc    Get classes I am assigned to teach
 * @access  Authenticated
 */
router.get('/schedule', getSchedule);

// =============================================================================
// CHECK-IN
// =============================================================================

/**
 * @route   POST /api/teaching/check-in
 * @desc    Mark myself as present for a session
 * @access  Authenticated (assistant)
 */
router.post('/check-in', checkIn);

// =============================================================================
// ATTENDANCE APPROVAL
// =============================================================================

/**
 * @route   GET /api/teaching/sessions/:sessionId/pending
 * @desc    Get pending attendance submissions for a session
 * @access  Assistant of class
 */
router.get('/sessions/:sessionId/pending', verifyAssistantForSession, getPendingAttendance);

/**
 * @route   PUT /api/teaching/attendance/:attendanceId/approve
 * @desc    Approve a student's attendance submission
 * @access  Authenticated (assistant)
 */
router.put('/attendance/:attendanceId/approve', approveAttendance);

/**
 * @route   PUT /api/teaching/attendance/:attendanceId/reject
 * @desc    Reject a student's attendance submission
 * @access  Authenticated (assistant)
 */
router.put('/attendance/:attendanceId/reject', rejectAttendance);

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * @route   GET /api/teaching/classes/:classId/sessions
 * @desc    Get sessions for a class I'm teaching
 * @access  Assistant of class
 */
router.get('/classes/:classId/sessions', verifyAssistantContext, getClassSessions);

/**
 * @route   GET /api/teaching/sessions/:sessionId/roster
 * @desc    Get student roster for a session
 * @access  Assistant of class
 */
router.get('/sessions/:sessionId/roster', verifyAssistantForSession, getSessionRoster);

/**
 * @route   PUT /api/teaching/sessions/:sessionId/update-batch
 * @desc    Batch update student attendance and grades
 * @access  Assistant of class
 */
router.put('/sessions/:sessionId/update-batch', verifyAssistantForSession, updateBatchAttendance);

export default router;
