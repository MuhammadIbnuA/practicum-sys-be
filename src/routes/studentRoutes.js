/**
 * Student Routes
 * /api/student/*
 * All routes require verifyToken
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { uploadPermissionLetter, convertToBase64, handleUploadError } from '../middleware/uploadMiddleware.js';
import {
    getMySchedule,
    submitAttendance,
    getOpenClasses,
    enrollClass,
    getMyClasses,
    getClassReport,
    submitPermission,
    getMyPermissions,
    getMyAttendanceRecap
} from '../controllers/studentController.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// =============================================================================
// SCHEDULE
// =============================================================================

/**
 * @route   GET /api/student/schedule
 * @desc    Get my weekly schedule (as praktikan)
 * @access  Authenticated
 */
router.get('/schedule', getMySchedule);

// =============================================================================
// ATTENDANCE SUBMISSION
// =============================================================================

/**
 * @route   POST /api/student/attendance/submit
 * @desc    Submit attendance for a session (awaits assistant approval)
 * @access  Authenticated
 */
router.post('/attendance/submit', submitAttendance);

// =============================================================================
// ENROLLMENT
// =============================================================================

/**
 * @route   GET /api/student/classes/open
 * @desc    Get open classes for enrollment in active semester
 * @access  Authenticated
 */
router.get('/classes/open', getOpenClasses);

/**
 * @route   POST /api/student/enroll
 * @desc    Enroll in a class
 * @access  Authenticated
 */
router.post('/enroll', enrollClass);

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * @route   GET /api/student/my-classes
 * @desc    Get my enrolled classes
 * @access  Authenticated
 */
router.get('/my-classes', getMyClasses);

/**
 * @route   GET /api/student/my-classes/:classId/report
 * @desc    Get class report with attendance and grades
 * @access  Authenticated
 */
router.get('/my-classes/:classId/report', getClassReport);

// =============================================================================
// PERMISSIONS
// =============================================================================

/**
 * @route   POST /api/student/permissions
 * @desc    Submit a permission request with file upload
 * @access  Authenticated
 */
router.post('/permissions', uploadPermissionLetter, convertToBase64, handleUploadError, submitPermission);

/**
 * @route   GET /api/student/permissions
 * @desc    Get my permission requests
 * @access  Authenticated
 */
router.get('/permissions', getMyPermissions);

// =============================================================================
// PERSONAL ATTENDANCE RECAP
// =============================================================================

/**
 * @route   GET /api/student/my-recap
 * @desc    Get my attendance recap across all enrolled classes
 * @access  Authenticated
 */
router.get('/my-recap', getMyAttendanceRecap);

export default router;

