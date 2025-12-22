/**
 * Student Controller
 * Handles enrollment, dashboard, schedule, attendance, and permissions
 */

import { PrismaClient } from '@prisma/client';
import { apiResponse, calculateAttendancePercentage, calculateAverageGrade } from '../utils/helpers.js';

const prisma = new PrismaClient();

// Day names for display
const DAY_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };

// =============================================================================
// SCHEDULE VIEW
// =============================================================================

/**
 * Get my weekly schedule (as praktikan)
 * GET /api/student/schedule
 */
export const getMySchedule = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get active semester
        const activeSemester = await prisma.semester.findFirst({
            where: { is_active: true }
        });

        if (!activeSemester) {
            return apiResponse.success(res, { schedule: {}, message: 'No active semester.' });
        }

        // Get enrollments for active semester
        const enrollments = await prisma.enrollment.findMany({
            where: {
                user_id: userId,
                class: { semester_id: activeSemester.id }
            },
            include: {
                class: {
                    include: {
                        course: true,
                        time_slot: true,
                        room: true,
                        assistants: {
                            include: { user: { select: { id: true, name: true } } }
                        }
                    }
                }
            }
        });

        // Get time slots and rooms for grid
        const [timeSlots, rooms] = await Promise.all([
            prisma.timeSlot.findMany({ orderBy: { slot_number: 'asc' } }),
            prisma.room.findMany({ orderBy: { code: 'asc' } })
        ]);

        // Build schedule grid
        const schedule = {};
        for (let day = 1; day <= 5; day++) {
            schedule[day] = {};
            for (const slot of timeSlots) {
                schedule[day][slot.slot_number] = null;
            }
        }

        // Fill in enrolled classes
        for (const enrollment of enrollments) {
            const cls = enrollment.class;
            const key = cls.day_of_week;
            const slotNum = cls.time_slot.slot_number;

            schedule[key][slotNum] = {
                id: cls.id,
                name: cls.name,
                course: cls.course,
                room: cls.room,
                time_slot: cls.time_slot,
                assistants: cls.assistants.map(a => a.user),
                role: 'praktikan'
            };
        }

        return apiResponse.success(res, {
            semester: activeSemester,
            timeSlots,
            dayNames: DAY_NAMES,
            schedule
        }, 'Schedule retrieved.');
    } catch (error) {
        console.error('Get my schedule error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ATTENDANCE SUBMISSION
// =============================================================================

/**
 * Submit attendance for a session (praktikan marks themselves present)
 * POST /api/student/attendance/submit
 */
export const submitAttendance = async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id } = req.body;

        if (!session_id) {
            return apiResponse.error(res, 'Session ID is required.', 400);
        }

        // Get session with class info
        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(session_id) },
            include: { class: true }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        // Verify enrollment
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: userId
                }
            }
        });

        if (!enrollment) {
            return apiResponse.error(res, 'You are not enrolled in this class.', 403);
        }

        // Check if already submitted
        const existing = await prisma.studentAttendance.findUnique({
            where: {
                enrollment_class_id_enrollment_user_id_session_id: {
                    enrollment_class_id: session.class_id,
                    enrollment_user_id: userId,
                    session_id: parseInt(session_id)
                }
            }
        });

        if (existing && existing.status !== 'ALPHA') {
            return apiResponse.error(res, 'Attendance already submitted for this session.', 409);
        }

        // Create or update attendance with PENDING status
        const attendance = await prisma.studentAttendance.upsert({
            where: {
                enrollment_class_id_enrollment_user_id_session_id: {
                    enrollment_class_id: session.class_id,
                    enrollment_user_id: userId,
                    session_id: parseInt(session_id)
                }
            },
            update: {
                status: 'PENDING',
                submitted_at: new Date()
            },
            create: {
                enrollment_class_id: session.class_id,
                enrollment_user_id: userId,
                session_id: parseInt(session_id),
                status: 'PENDING',
                submitted_at: new Date()
            },
            include: {
                session: {
                    include: { class: { include: { course: true } } }
                }
            }
        });

        return apiResponse.success(res, attendance, 'Attendance submitted. Awaiting assistant approval.', 201);
    } catch (error) {
        console.error('Submit attendance error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ENROLLMENT
// =============================================================================

/**
 * Get open classes for enrollment
 * GET /api/student/classes/open
 */
export const getOpenClasses = async (req, res) => {
    try {
        const activeSemester = await prisma.semester.findFirst({
            where: { is_active: true }
        });

        if (!activeSemester) {
            return apiResponse.error(res, 'No active semester found.', 404);
        }

        const classes = await prisma.class.findMany({
            where: { semester_id: activeSemester.id },
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                assistants: {
                    include: { user: { select: { id: true, name: true } } }
                },
                _count: { select: { enrollments: true } }
            },
            orderBy: [
                { day_of_week: 'asc' },
                { time_slot_id: 'asc' }
            ]
        });

        const classesWithQuota = classes.map(cls => ({
            ...cls,
            day_name: DAY_NAMES[cls.day_of_week],
            enrolled_count: cls._count.enrollments,
            available_quota: cls.quota - cls._count.enrollments,
            is_available: cls.quota > cls._count.enrollments
        }));

        return apiResponse.success(res, classesWithQuota, 'Open classes retrieved.');
    } catch (error) {
        console.error('Get open classes error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Enroll in a class
 * POST /api/student/enroll
 */
export const enrollClass = async (req, res) => {
    try {
        const userId = req.user.id;
        const { classId } = req.body;

        if (!classId) {
            return apiResponse.error(res, 'Class ID is required.', 400);
        }

        const targetClass = await prisma.class.findUnique({
            where: { id: parseInt(classId) },
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                _count: { select: { enrollments: true } }
            }
        });

        if (!targetClass) {
            return apiResponse.error(res, 'Class not found.', 404);
        }

        if (!targetClass.semester.is_active) {
            return apiResponse.error(res, 'Cannot enroll in classes from inactive semesters.', 400);
        }

        if (targetClass._count.enrollments >= targetClass.quota) {
            return apiResponse.error(res, 'Class is full. No available quota.', 400);
        }

        // Check duplicate course enrollment
        const existingEnrollment = await prisma.enrollment.findFirst({
            where: {
                user_id: userId,
                class: {
                    course_id: targetClass.course_id,
                    semester_id: targetClass.semester_id
                }
            },
            include: { class: true }
        });

        if (existingEnrollment) {
            return apiResponse.error(res, `Already enrolled in ${existingEnrollment.class.name} for this course.`, 409);
        }

        const enrollment = await prisma.$transaction(async (tx) => {
            const currentCount = await tx.enrollment.count({
                where: { class_id: parseInt(classId) }
            });

            if (currentCount >= targetClass.quota) {
                throw new Error('QUOTA_EXCEEDED');
            }

            return tx.enrollment.create({
                data: {
                    class_id: parseInt(classId),
                    user_id: userId
                },
                include: {
                    class: { include: { course: true, semester: true, time_slot: true, room: true } }
                }
            });
        });

        return apiResponse.success(res, {
            ...enrollment,
            class: { ...enrollment.class, day_name: DAY_NAMES[enrollment.class.day_of_week] }
        }, 'Successfully enrolled.', 201);
    } catch (error) {
        console.error('Enroll class error:', error);
        if (error.message === 'QUOTA_EXCEEDED') {
            return apiResponse.error(res, 'Class is full. No available quota.', 400);
        }
        if (error.code === 'P2002') {
            return apiResponse.error(res, 'Already enrolled in this class.', 409);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// DASHBOARD
// =============================================================================

/**
 * Get my enrolled classes
 * GET /api/student/my-classes
 */
export const getMyClasses = async (req, res) => {
    try {
        const userId = req.user.id;

        const enrollments = await prisma.enrollment.findMany({
            where: { user_id: userId },
            include: {
                class: {
                    include: {
                        course: true,
                        semester: true,
                        time_slot: true,
                        room: true,
                        assistants: {
                            include: { user: { select: { id: true, name: true } } }
                        }
                    }
                }
            },
            orderBy: { class: { semester: { id: 'desc' } } }
        });

        const classes = enrollments.map(e => ({
            ...e.class,
            day_name: DAY_NAMES[e.class.day_of_week],
            enrolled_at: e.enrolled_at
        }));

        return apiResponse.success(res, classes, 'My classes retrieved.');
    } catch (error) {
        console.error('Get my classes error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get class report with attendance and grades
 * GET /api/student/my-classes/:classId/report
 */
export const getClassReport = async (req, res) => {
    try {
        const userId = req.user.id;
        const { classId } = req.params;

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                class_id_user_id: {
                    class_id: parseInt(classId),
                    user_id: userId
                }
            },
            include: {
                class: {
                    include: {
                        course: true,
                        semester: true,
                        time_slot: true,
                        room: true,
                        sessions: { orderBy: { session_number: 'asc' } }
                    }
                },
                attendances: true
            }
        });

        if (!enrollment) {
            return apiResponse.error(res, 'You are not enrolled in this class.', 403);
        }

        const attendanceMap = new Map();
        enrollment.attendances.forEach(a => attendanceMap.set(a.session_id, a));

        const now = new Date();
        const pastSessions = enrollment.class.sessions.filter(s => s.date && new Date(s.date) <= now);
        const grades = enrollment.attendances.map(a => a.grade).filter(g => g !== null);
        let presentCount = enrollment.attendances.filter(a => a.status === 'HADIR').length;

        const sessions = enrollment.class.sessions.map(session => {
            const attendance = attendanceMap.get(session.id);
            return {
                id: session.id,
                session_number: session.session_number,
                date: session.date,
                topic: session.topic,
                type: session.type,
                status: attendance?.status || null,
                grade: attendance?.grade || null,
                submitted_at: attendance?.submitted_at || null,
                approved_at: attendance?.approved_at || null
            };
        });

        const report = {
            class: {
                id: enrollment.class.id,
                name: enrollment.class.name,
                day_of_week: enrollment.class.day_of_week,
                day_name: DAY_NAMES[enrollment.class.day_of_week],
                time_slot: enrollment.class.time_slot,
                room: enrollment.class.room,
                course: enrollment.class.course,
                semester: enrollment.class.semester
            },
            enrolled_at: enrollment.enrolled_at,
            sessions,
            summary: {
                total_sessions: enrollment.class.sessions.length,
                past_sessions: pastSessions.length,
                present_count: presentCount,
                attendance_percentage: calculateAttendancePercentage(presentCount, pastSessions.length),
                current_average_grade: calculateAverageGrade(grades),
                graded_sessions: grades.length
            }
        };

        return apiResponse.success(res, report, 'Class report retrieved.');
    } catch (error) {
        console.error('Get class report error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// PERMISSIONS
// =============================================================================

/**
 * Submit a permission request
 * POST /api/student/permissions
 */
export const submitPermission = async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id, reason } = req.body;

        if (!session_id || !reason) {
            return apiResponse.error(res, 'Session ID and reason are required.', 400);
        }

        if (!req.file) {
            return apiResponse.error(res, 'Permission letter file is required.', 400);
        }

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(session_id) },
            include: { class: true }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        const enrollment = await prisma.enrollment.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: userId
                }
            }
        });

        if (!enrollment) {
            return apiResponse.error(res, 'You are not enrolled in this class.', 403);
        }

        const existingRequest = await prisma.permissionRequest.findFirst({
            where: {
                student_id: userId,
                session_id: parseInt(session_id),
                status: 'PENDING'
            }
        });

        if (existingRequest) {
            return apiResponse.error(res, 'You already have a pending request for this session.', 409);
        }

        const permission = await prisma.permissionRequest.create({
            data: {
                student_id: userId,
                session_id: parseInt(session_id),
                file_name: req.file.originalname,
                file_data: req.file.base64,
                reason
            },
            include: {
                session: { include: { class: { include: { course: true } } } }
            }
        });

        return apiResponse.success(res, permission, 'Permission request submitted.', 201);
    } catch (error) {
        console.error('Submit permission error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get my permission requests
 * GET /api/student/permissions
 */
export const getMyPermissions = async (req, res) => {
    try {
        const userId = req.user.id;

        const permissions = await prisma.permissionRequest.findMany({
            where: { student_id: userId },
            include: {
                session: { include: { class: { include: { course: true } } } }
            },
            orderBy: { created_at: 'desc' }
        });

        return apiResponse.success(res, permissions, 'My permission requests retrieved.');
    } catch (error) {
        console.error('Get my permissions error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

export default {
    getMySchedule,
    submitAttendance,
    getOpenClasses,
    enrollClass,
    getMyClasses,
    getClassReport,
    submitPermission,
    getMyPermissions
};
