/**
 * Admin Routes
 * /api/admin/*
 * All routes require verifyToken + verifyAdmin
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../middleware/roleMiddleware.js';
import {
    // Time Slots & Rooms
    getTimeSlots,
    getRooms,
    createRoom,
    getMasterSchedule,
    // Semester
    getSemesters,
    createSemester,
    activateSemester,
    // Course
    getCourses,
    createCourse,
    // Class
    getClassesBySemester,
    createClass,
    updateClass,
    // Assistant
    assignAssistant,
    removeAssistant,
    // Permission
    getPermissions,
    approvePermission,
    rejectPermission,
    // Assistant Logs
    getAssistantLogs,
    validateAssistant
} from '../controllers/adminController.js';

const router = Router();

// Apply middleware to all routes
router.use(verifyToken);
router.use(verifyAdmin);

// =============================================================================
// TIME SLOTS & ROOMS
// =============================================================================

/**
 * @route   GET /api/admin/time-slots
 * @desc    Get all time slots
 * @access  Admin
 */
router.get('/time-slots', getTimeSlots);

/**
 * @route   GET /api/admin/rooms
 * @desc    Get all rooms
 * @access  Admin
 */
router.get('/rooms', getRooms);

/**
 * @route   POST /api/admin/rooms
 * @desc    Create a new room
 * @access  Admin
 */
router.post('/rooms', createRoom);

// =============================================================================
// SEMESTER MANAGEMENT
// =============================================================================

/**
 * @route   GET /api/admin/semesters
 * @desc    Get all semesters
 * @access  Admin
 */
router.get('/semesters', getSemesters);

/**
 * @route   POST /api/admin/semesters
 * @desc    Create a new semester
 * @access  Admin
 */
router.post('/semesters', createSemester);

/**
 * @route   PUT /api/admin/semesters/:id/activate
 * @desc    Activate a semester (deactivates others)
 * @access  Admin
 */
router.put('/semesters/:id/activate', activateSemester);

/**
 * @route   GET /api/admin/semesters/:id/schedule
 * @desc    Get master schedule for a semester (jadwal besar)
 * @access  Admin
 */
router.get('/semesters/:id/schedule', getMasterSchedule);

// =============================================================================
// COURSE MANAGEMENT
// =============================================================================

/**
 * @route   GET /api/admin/courses
 * @desc    Get all courses
 * @access  Admin
 */
router.get('/courses', getCourses);

/**
 * @route   POST /api/admin/courses
 * @desc    Create a new course
 * @access  Admin
 */
router.post('/courses', createCourse);

// =============================================================================
// CLASS MANAGEMENT
// =============================================================================

/**
 * @route   GET /api/admin/semesters/:semesterId/classes
 * @desc    Get classes by semester
 * @access  Admin
 */
router.get('/semesters/:semesterId/classes', getClassesBySemester);

/**
 * @route   POST /api/admin/classes
 * @desc    Create a new class (auto-generates 11 sessions)
 * @access  Admin
 */
router.post('/classes', createClass);

/**
 * @route   PUT /api/admin/classes/:classId
 * @desc    Update class details
 * @access  Admin
 */
router.put('/classes/:classId', updateClass);

// =============================================================================
// ASSISTANT ASSIGNMENT
// =============================================================================

/**
 * @route   POST /api/admin/classes/:classId/assistants
 * @desc    Assign an assistant to a class
 * @access  Admin
 */
router.post('/classes/:classId/assistants', assignAssistant);

/**
 * @route   DELETE /api/admin/classes/:classId/assistants/:userId
 * @desc    Remove an assistant from a class
 * @access  Admin
 */
router.delete('/classes/:classId/assistants/:userId', removeAssistant);

// =============================================================================
// PERMISSION MANAGEMENT
// =============================================================================

/**
 * @route   GET /api/admin/permissions
 * @desc    Get permission requests (filter by status query param)
 * @access  Admin
 */
router.get('/permissions', getPermissions);

/**
 * @route   PUT /api/admin/permissions/:requestId/approve
 * @desc    Approve a permission request & update attendance
 * @access  Admin
 */
router.put('/permissions/:requestId/approve', approvePermission);

/**
 * @route   PUT /api/admin/permissions/:requestId/reject
 * @desc    Reject a permission request
 * @access  Admin
 */
router.put('/permissions/:requestId/reject', rejectPermission);

// =============================================================================
// ASSISTANT MONITORING
// =============================================================================

/**
 * @route   GET /api/admin/assistants/log
 * @desc    Get assistant attendance logs
 * @access  Admin
 */
router.get('/assistants/log', getAssistantLogs);

/**
 * @route   POST /api/admin/assistants/validate
 * @desc    Validate assistant presence for a session
 * @access  Admin
 */
router.post('/assistants/validate', validateAssistant);

export default router;
