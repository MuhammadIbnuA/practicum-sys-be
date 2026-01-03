/**
 * Admin Controller
 * Handles all admin operations: semesters, courses, classes, rooms, schedule, permissions
 */

import prisma from '../lib/prisma.js';
import { apiResponse, mapReasonToStatus } from '../utils/helpers.js';

// Day names for display
const DAY_NAMES = {
    1: 'Senin',
    2: 'Selasa',
    3: 'Rabu',
    4: 'Kamis',
    5: 'Jumat'
};

// =============================================================================
// TIME SLOTS & ROOMS
// =============================================================================

/**
 * Get all time slots
 * GET /api/admin/time-slots
 */
export const getTimeSlots = async (req, res) => {
    try {
        const timeSlots = await prisma.timeSlot.findMany({
            orderBy: { slot_number: 'asc' }
        });

        return apiResponse.success(res, timeSlots, 'Time slots retrieved.');
    } catch (error) {
        console.error('Get time slots error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get all rooms
 * GET /api/admin/rooms
 */
export const getRooms = async (req, res) => {
    try {
        const rooms = await prisma.room.findMany({
            orderBy: { code: 'asc' },
            include: {
                _count: {
                    select: { classes: true }
                }
            }
        });

        return apiResponse.success(res, rooms, 'Rooms retrieved.');
    } catch (error) {
        console.error('Get rooms error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Create a new room
 * POST /api/admin/rooms
 */
export const createRoom = async (req, res) => {
    try {
        const { code, name } = req.body;

        if (!code || !name) {
            return apiResponse.error(res, 'Room code and name are required.', 400);
        }

        const room = await prisma.room.create({
            data: { code, name }
        });

        return apiResponse.success(res, room, 'Room created.', 201);
    } catch (error) {
        console.error('Create room error:', error);
        if (error.code === 'P2002') {
            return apiResponse.error(res, 'Room code already exists.', 409);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// MASTER SCHEDULE VIEW
// =============================================================================

/**
 * Get master schedule for a semester (jadwal besar)
 * GET /api/admin/semesters/:id/schedule
 */
export const getMasterSchedule = async (req, res) => {
    try {
        const { id } = req.params;

        const semester = await prisma.semester.findUnique({
            where: { id: parseInt(id) }
        });

        if (!semester) {
            return apiResponse.error(res, 'Semester not found.', 404);
        }

        // Get all rooms and time slots
        const [rooms, timeSlots] = await Promise.all([
            prisma.room.findMany({ orderBy: { code: 'asc' } }),
            prisma.timeSlot.findMany({ orderBy: { slot_number: 'asc' } })
        ]);

        // Get all classes for this semester with details
        const classes = await prisma.class.findMany({
            where: { semester_id: parseInt(id) },
            include: {
                course: true,
                time_slot: true,
                room: true,
                assistants: {
                    include: {
                        user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                },
                _count: {
                    select: { enrollments: true }
                }
            }
        });

        // Build schedule grid: schedule[day][slot][room] = class
        const schedule = {};
        for (let day = 1; day <= 5; day++) {
            schedule[day] = {};
            for (const slot of timeSlots) {
                schedule[day][slot.slot_number] = {};
                for (const room of rooms) {
                    schedule[day][slot.slot_number][room.code] = null;
                }
            }
        }

        // Fill in classes
        for (const cls of classes) {
            const day = cls.day_of_week;
            const slot = cls.time_slot.slot_number;
            const room = cls.room.code;

            schedule[day][slot][room] = {
                id: cls.id,
                name: cls.name,
                course: cls.course,
                quota: cls.quota,
                enrolled: cls._count.enrollments,
                assistants: cls.assistants.map(a => a.user)
            };
        }

        return apiResponse.success(res, {
            semester,
            rooms,
            timeSlots,
            dayNames: DAY_NAMES,
            schedule
        }, 'Master schedule retrieved.');
    } catch (error) {
        console.error('Get master schedule error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// SEMESTER MANAGEMENT
// =============================================================================

/**
 * Get all semesters
 * GET /api/admin/semesters
 */
export const getSemesters = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const [semesters, total] = await Promise.all([
            prisma.semester.findMany({
                include: {
                    _count: { select: { classes: true } }
                },
                orderBy: { id: 'desc' },
                skip,
                take: limit
            }),
            prisma.semester.count()
        ]);

        return apiResponse.success(res, {
            data: semesters,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'Semesters retrieved.');
    } catch (error) {
        console.error('Get semesters error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Create a new semester
 * POST /api/admin/semesters
 */
export const createSemester = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name) {
            return apiResponse.error(res, 'Semester name is required.', 400);
        }

        const semester = await prisma.semester.create({
            data: { name, is_active: false }
        });

        return apiResponse.success(res, semester, 'Semester created.', 201);
    } catch (error) {
        console.error('Create semester error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Activate a semester (deactivates all others)
 * PUT /api/admin/semesters/:id/activate
 */
export const activateSemester = async (req, res) => {
    try {
        const { id } = req.params;

        // Transaction: deactivate all, then activate selected
        const semester = await prisma.$transaction(async (tx) => {
            await tx.semester.updateMany({
                data: { is_active: false }
            });

            return tx.semester.update({
                where: { id: parseInt(id) },
                data: { is_active: true }
            });
        });

        return apiResponse.success(res, semester, 'Semester activated.');
    } catch (error) {
        console.error('Activate semester error:', error);
        if (error.code === 'P2025') {
            return apiResponse.error(res, 'Semester not found.', 404);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// COURSE MANAGEMENT
// =============================================================================

/**
 * Get all courses
 * GET /api/admin/courses
 */
export const getCourses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const [courses, total] = await Promise.all([
            prisma.course.findMany({
                include: {
                    _count: { select: { classes: true } }
                },
                orderBy: { code: 'asc' },
                skip,
                take: limit
            }),
            prisma.course.count()
        ]);

        return apiResponse.success(res, {
            data: courses,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'Courses retrieved.');
    } catch (error) {
        console.error('Get courses error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Create a new course
 * POST /api/admin/courses
 */
export const createCourse = async (req, res) => {
    try {
        const { code, name } = req.body;

        if (!code || !name) {
            return apiResponse.error(res, 'Course code and name are required.', 400);
        }

        const existing = await prisma.course.findUnique({
            where: { code }
        });

        if (existing) {
            return apiResponse.error(res, 'Course code already exists.', 409);
        }

        const course = await prisma.course.create({
            data: { code, name }
        });

        return apiResponse.success(res, course, 'Course created.', 201);
    } catch (error) {
        console.error('Create course error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// CLASS MANAGEMENT
// =============================================================================

/**
 * Get classes by semester
 * GET /api/admin/semesters/:semesterId/classes
 */
export const getClassesBySemester = async (req, res) => {
    try {
        const { semesterId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [classes, total] = await Promise.all([
            prisma.class.findMany({
                where: { semester_id: parseInt(semesterId) },
                select: {
                    id: true,
                    course_id: true,
                    semester_id: true,
                    name: true,
                    quota: true,
                    day_of_week: true,
                    time_slot_id: true,
                    room_id: true,
                    created_at: true,
                    updated_at: true,
                    course: { select: { id: true, code: true, name: true } },
                    semester: { select: { id: true, name: true } },
                    time_slot: { select: { id: true, label: true, start_time: true, end_time: true } },
                    room: { select: { id: true, code: true, name: true } },
                    _count: { select: { enrollments: true, sessions: true } }
                },
                orderBy: [
                    { day_of_week: 'asc' },
                    { time_slot_id: 'asc' },
                    { room_id: 'asc' }
                ],
                skip,
                take: limit
            }),
            prisma.class.count({ where: { semester_id: parseInt(semesterId) } })
        ]);

        // Add day name for convenience
        const classesWithDayName = classes.map(c => ({
            ...c,
            day_name: DAY_NAMES[c.day_of_week]
        }));

        return apiResponse.success(res, {
            data: classesWithDayName,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'Classes retrieved.');
    } catch (error) {
        console.error('Get classes by semester error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Create a new class with auto-generated sessions
 * POST /api/admin/classes
 */
export const createClass = async (req, res) => {
    try {
        const { course_id, semester_id, name, quota, day_of_week, time_slot_id, room_id } = req.body;

        // Validation
        if (!course_id || !semester_id || !name || !quota || !day_of_week || !time_slot_id || !room_id) {
            return apiResponse.error(res, 'All fields are required: course_id, semester_id, name, quota, day_of_week, time_slot_id, room_id.', 400);
        }

        if (day_of_week < 1 || day_of_week > 5) {
            return apiResponse.error(res, 'day_of_week must be 1-5 (Monday-Friday).', 400);
        }

        // Verify foreign keys exist
        const [course, semester, timeSlot, room] = await Promise.all([
            prisma.course.findUnique({ where: { id: parseInt(course_id) } }),
            prisma.semester.findUnique({ where: { id: parseInt(semester_id) } }),
            prisma.timeSlot.findUnique({ where: { id: parseInt(time_slot_id) } }),
            prisma.room.findUnique({ where: { id: parseInt(room_id) } })
        ]);

        if (!course) return apiResponse.error(res, 'Course not found.', 404);
        if (!semester) return apiResponse.error(res, 'Semester not found.', 404);
        if (!timeSlot) return apiResponse.error(res, 'Time slot not found.', 404);
        if (!room) return apiResponse.error(res, 'Room not found.', 404);

        // Create class with 11 sessions in a transaction
        const result = await prisma.$transaction(async (tx) => {
            const newClass = await tx.class.create({
                data: {
                    course_id: parseInt(course_id),
                    semester_id: parseInt(semester_id),
                    name,
                    quota: parseInt(quota),
                    day_of_week: parseInt(day_of_week),
                    time_slot_id: parseInt(time_slot_id),
                    room_id: parseInt(room_id)
                }
            });

            // Generate 11 sessions
            const sessions = [];
            for (let i = 1; i <= 11; i++) {
                sessions.push({
                    class_id: newClass.id,
                    session_number: i,
                    topic: i === 11 ? 'Responsi' : `Pertemuan ${i}`,
                    type: i === 11 ? 'EXAM' : 'REGULAR'
                });
            }

            await tx.classSession.createMany({ data: sessions });

            return newClass;
        });

        // Fetch complete class with relations
        const classWithDetails = await prisma.class.findUnique({
            where: { id: result.id },
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                sessions: {
                    orderBy: { session_number: 'asc' }
                }
            }
        });

        return apiResponse.success(res, {
            ...classWithDetails,
            day_name: DAY_NAMES[classWithDetails.day_of_week]
        }, 'Class created with 11 sessions.', 201);
    } catch (error) {
        console.error('Create class error:', error);
        if (error.code === 'P2002') {
            const target = error.meta?.target;
            if (target?.includes('day_of_week')) {
                return apiResponse.error(res, 'Schedule conflict: This time slot is already taken for this room and day.', 409);
            }
            return apiResponse.error(res, 'Class with this name already exists for this course and semester.', 409);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Update class details
 * PUT /api/admin/classes/:classId
 */
export const updateClass = async (req, res) => {
    try {
        const { classId } = req.params;
        const { name, quota, day_of_week, time_slot_id, room_id } = req.body;

        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (quota !== undefined) updateData.quota = parseInt(quota);
        if (day_of_week !== undefined) updateData.day_of_week = parseInt(day_of_week);
        if (time_slot_id !== undefined) updateData.time_slot_id = parseInt(time_slot_id);
        if (room_id !== undefined) updateData.room_id = parseInt(room_id);

        const updatedClass = await prisma.class.update({
            where: { id: parseInt(classId) },
            data: updateData,
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                assistants: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                _count: { select: { enrollments: true } }
            }
        });

        return apiResponse.success(res, {
            ...updatedClass,
            day_name: DAY_NAMES[updatedClass.day_of_week]
        }, 'Class updated.');
    } catch (error) {
        console.error('Update class error:', error);
        if (error.code === 'P2025') {
            return apiResponse.error(res, 'Class not found.', 404);
        }
        if (error.code === 'P2002') {
            return apiResponse.error(res, 'Schedule conflict.', 409);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ASSISTANT ASSIGNMENT
// =============================================================================

/**
 * Assign an assistant to a class
 * POST /api/admin/classes/:classId/assistants
 */
export const assignAssistant = async (req, res) => {
    try {
        const { classId } = req.params;
        const { user_id } = req.body;

        if (!user_id) {
            return apiResponse.error(res, 'User ID is required.', 400);
        }

        const [classExists, userExists] = await Promise.all([
            prisma.class.findUnique({ where: { id: parseInt(classId) } }),
            prisma.user.findUnique({ where: { id: parseInt(user_id) } })
        ]);

        if (!classExists) return apiResponse.error(res, 'Class not found.', 404);
        if (!userExists) return apiResponse.error(res, 'User not found.', 404);

        const assignment = await prisma.classAssistant.create({
            data: {
                class_id: parseInt(classId),
                user_id: parseInt(user_id)
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                class: { include: { course: true, time_slot: true, room: true } }
            }
        });

        return apiResponse.success(res, assignment, 'Assistant assigned.', 201);
    } catch (error) {
        console.error('Assign assistant error:', error);
        if (error.code === 'P2002') {
            return apiResponse.error(res, 'User is already assigned as assistant for this class.', 409);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Remove an assistant from a class
 * DELETE /api/admin/classes/:classId/assistants/:userId
 */
export const removeAssistant = async (req, res) => {
    try {
        const { classId, userId } = req.params;

        await prisma.classAssistant.delete({
            where: {
                class_id_user_id: {
                    class_id: parseInt(classId),
                    user_id: parseInt(userId)
                }
            }
        });

        return apiResponse.success(res, null, 'Assistant removed.');
    } catch (error) {
        console.error('Remove assistant error:', error);
        if (error.code === 'P2025') {
            return apiResponse.error(res, 'Assignment not found.', 404);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// PERMISSION MANAGEMENT
// =============================================================================

/**
 * Get permission requests
 * GET /api/admin/permissions
 */
export const getPermissions = async (req, res) => {
    try {
        const { status } = req.query;

        const where = {};
        if (status) {
            where.status = status.toUpperCase();
        }

        const permissions = await prisma.permissionRequest.findMany({
            where,
            include: {
                student: { select: { id: true, name: true, email: true } },
                session: {
                    include: {
                        class: { include: { course: true, time_slot: true, room: true } }
                    }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        return apiResponse.success(res, permissions, 'Permission requests retrieved.');
    } catch (error) {
        console.error('Get permissions error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Approve permission request
 * PUT /api/admin/permissions/:requestId/approve
 */
export const approvePermission = async (req, res) => {
    try {
        const { requestId } = req.params;
        const { new_status } = req.body;

        const permission = await prisma.permissionRequest.findUnique({
            where: { id: parseInt(requestId) },
            include: { session: true }
        });

        if (!permission) return apiResponse.error(res, 'Permission request not found.', 404);
        if (permission.status !== 'PENDING') {
            return apiResponse.error(res, 'Permission request already processed.', 400);
        }

        const attendanceStatus = new_status || mapReasonToStatus(permission.reason);

        const result = await prisma.$transaction(async (tx) => {
            const updatedPermission = await tx.permissionRequest.update({
                where: { id: parseInt(requestId) },
                data: { status: 'APPROVED' }
            });

            const enrollment = await tx.enrollment.findFirst({
                where: {
                    user_id: permission.student_id,
                    class_id: permission.session.class_id
                }
            });

            if (enrollment) {
                await tx.studentAttendance.upsert({
                    where: {
                        enrollment_class_id_enrollment_user_id_session_id: {
                            enrollment_class_id: enrollment.class_id,
                            enrollment_user_id: enrollment.user_id,
                            session_id: permission.session_id
                        }
                    },
                    update: {
                        status: attendanceStatus,
                        proof_file_url: permission.file_url
                    },
                    create: {
                        enrollment_class_id: enrollment.class_id,
                        enrollment_user_id: enrollment.user_id,
                        session_id: permission.session_id,
                        status: attendanceStatus,
                        proof_file_url: permission.file_url
                    }
                });
            }

            return updatedPermission;
        });

        return apiResponse.success(res, result, `Permission approved. Status: ${attendanceStatus}.`);
    } catch (error) {
        console.error('Approve permission error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Reject permission request
 * PUT /api/admin/permissions/:requestId/reject
 */
export const rejectPermission = async (req, res) => {
    try {
        const { requestId } = req.params;

        const permission = await prisma.permissionRequest.findUnique({
            where: { id: parseInt(requestId) }
        });

        if (!permission) return apiResponse.error(res, 'Permission request not found.', 404);
        if (permission.status !== 'PENDING') {
            return apiResponse.error(res, 'Permission request already processed.', 400);
        }

        const updated = await prisma.permissionRequest.update({
            where: { id: parseInt(requestId) },
            data: { status: 'REJECTED' }
        });

        return apiResponse.success(res, updated, 'Permission request rejected.');
    } catch (error) {
        console.error('Reject permission error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ASSISTANT MONITORING
// =============================================================================

/**
 * Get assistant attendance logs
 * GET /api/admin/assistants/log
 */
export const getAssistantLogs = async (req, res) => {
    try {
        const { class_id, user_id } = req.query;

        const where = {};
        if (class_id) where.session = { class_id: parseInt(class_id) };
        if (user_id) where.user_id = parseInt(user_id);

        const logs = await prisma.assistantAttendance.findMany({
            where,
            include: {
                user: { select: { id: true, name: true, email: true } },
                session: {
                    include: {
                        class: { include: { course: true } }
                    }
                }
            },
            orderBy: { check_in_time: 'desc' }
        });

        return apiResponse.success(res, logs, 'Assistant logs retrieved.');
    } catch (error) {
        console.error('Get assistant logs error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Validate assistant presence
 * POST /api/admin/assistants/validate
 */
export const validateAssistant = async (req, res) => {
    try {
        const { user_id, session_id, status } = req.body;

        if (!user_id || !session_id) {
            return apiResponse.error(res, 'User ID and Session ID are required.', 400);
        }

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(session_id) }
        });

        if (!session) return apiResponse.error(res, 'Session not found.', 404);

        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: parseInt(user_id)
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'User is not assigned as assistant for this class.', 400);
        }

        const attendance = await prisma.assistantAttendance.upsert({
            where: {
                user_id_session_id: {
                    user_id: parseInt(user_id),
                    session_id: parseInt(session_id)
                }
            },
            update: { status: status || 'HADIR' },
            create: {
                user_id: parseInt(user_id),
                session_id: parseInt(session_id),
                status: status || 'HADIR'
            },
            include: {
                user: { select: { id: true, name: true, email: true } },
                session: true
            }
        });

        return apiResponse.success(res, attendance, 'Assistant attendance validated.');
    } catch (error) {
        console.error('Validate assistant error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// GET ALL CLASSES (for admin panel)
// =============================================================================

/**
 * Get all classes with details
 * GET /api/admin/classes
 */
export const getAllClasses = async (req, res) => {
    try {
        const classes = await prisma.class.findMany({
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                assistants: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                _count: { select: { enrollments: true } }
            },
            orderBy: [{ semester_id: 'desc' }, { course_id: 'asc' }, { name: 'asc' }]
        });

        const result = classes.map(c => ({
            ...c,
            day_name: DAY_NAMES[c.day_of_week],
            enrolled_count: c._count.enrollments
        }));

        return apiResponse.success(res, result, 'All classes retrieved.');
    } catch (error) {
        console.error('Get all classes error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ADMIN UPDATE ATTENDANCE (for recap grid)
// =============================================================================

/**
 * Admin update attendance status
 * PUT /api/admin/sessions/:sessionId/attendance
 */
export const updateAttendanceStatus = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { updates } = req.body; // [{ studentId, status }]

        if (!updates || !Array.isArray(updates)) {
            return apiResponse.error(res, 'Updates array is required.', 400);
        }

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: { class: true }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        // Get enrollments (using composite key: class_id, user_id)
        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: session.class_id },
            select: { class_id: true, user_id: true }
        });

        // Map user_id to enrollment composite key
        const userEnrollmentMap = new Map(
            enrollments.map(e => [e.user_id, { class_id: e.class_id, user_id: e.user_id }])
        );

        let updated = 0;
        for (const { studentId, status } of updates) {
            const enrollment = userEnrollmentMap.get(studentId);
            if (!enrollment) continue;

            // StudentAttendance uses enrollment_class_id, enrollment_user_id, session_id
            await prisma.studentAttendance.upsert({
                where: {
                    enrollment_class_id_enrollment_user_id_session_id: {
                        enrollment_class_id: enrollment.class_id,
                        enrollment_user_id: enrollment.user_id,
                        session_id: parseInt(sessionId)
                    }
                },
                update: { status },
                create: {
                    enrollment_class_id: enrollment.class_id,
                    enrollment_user_id: enrollment.user_id,
                    session_id: parseInt(sessionId),
                    status,
                    submitted_at: new Date()
                }
            });
            updated++;
        }

        return apiResponse.success(res, { updated }, `${updated} attendance records updated.`);
    } catch (error) {
        console.error('Update attendance status error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ASSISTANT CHECK-IN RECAP (Admin view of all assistant attendance)
// =============================================================================

/**
 * Get assistant check-in recap for all classes
 * GET /api/admin/assistant-recap
 */
export const getAssistantCheckInRecap = async (req, res) => {
    try {
        const { semester_id } = req.query;

        // Get active semester if not specified
        let semesterId = semester_id ? parseInt(semester_id) : null;
        if (!semesterId) {
            const activeSemester = await prisma.semester.findFirst({
                where: { is_active: true }
            });
            semesterId = activeSemester?.id;
        }

        if (!semesterId) {
            return apiResponse.success(res, [], 'No active semester.');
        }

        // Get all classes with assistants and their check-ins
        const classes = await prisma.class.findMany({
            where: { semester_id: semesterId },
            include: {
                course: true,
                assistants: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                },
                sessions: {
                    orderBy: { session_number: 'asc' },
                    include: {
                        assistantAttendances: true
                    }
                }
            }
        });

        // Build recap grid
        const recap = classes.map(cls => {
            const assistantsRecap = cls.assistants.map(asst => {
                const checkIns = cls.sessions.map(session => {
                    const attendance = session.assistantAttendances.find(
                        a => a.user_id === asst.user.id
                    );
                    return {
                        session_number: session.session_number,
                        checked_in: !!attendance,
                        check_in_time: attendance?.check_in_time || null
                    };
                });

                const presentCount = checkIns.filter(c => c.checked_in).length;

                return {
                    assistant_id: asst.user.id,
                    assistant_name: asst.user.name,
                    assistant_email: asst.user.email,
                    sessions: checkIns,
                    stats: {
                        present_count: presentCount,
                        total_sessions: cls.sessions.length,
                        attendance_percentage: cls.sessions.length > 0
                            ? Math.round((presentCount / cls.sessions.length) * 100)
                            : 0
                    }
                };
            });

            return {
                class_id: cls.id,
                class_name: cls.name,
                course: cls.course,
                total_sessions: cls.sessions.length,
                assistants: assistantsRecap
            };
        });

        return apiResponse.success(res, recap, 'Assistant check-in recap retrieved.');
    } catch (error) {
        console.error('Get assistant check-in recap error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

export default {
    // Time Slots & Rooms
    getTimeSlots,
    getRooms,
    createRoom,
    getMasterSchedule,
    // Semesters
    getSemesters,
    createSemester,
    activateSemester,
    // Courses
    getCourses,
    createCourse,
    // Classes
    getClassesBySemester,
    getAllClasses,
    createClass,
    updateClass,
    // Assistants
    assignAssistant,
    removeAssistant,
    // Permissions
    getPermissions,
    approvePermission,
    rejectPermission,
    // Assistant Logs
    getAssistantLogs,
    validateAssistant,
    // Attendance
    updateAttendanceStatus,
    getAssistantCheckInRecap
};



