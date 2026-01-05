/**
 * Student Controller
 * Handles enrollment, dashboard, schedule, attendance, and permissions
 */

import prisma from '../lib/prisma.js';
import { apiResponse, calculateAttendancePercentage, calculateAverageGrade } from '../utils/helpers.js';
import { uploadBase64File, BUCKETS, deleteFile, parseMinioUrl } from '../services/minioService.js';

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
 * Enroll in a class (DEPRECATED - Now requires payment)
 * POST /api/student/enroll
 * @deprecated Use payment system instead
 */
export const enrollClass = async (req, res) => {
    return apiResponse.error(res, 'Direct enrollment is disabled. Please use the payment system to enroll in classes.', 403);
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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where: { user_id: userId },
                select: {
                    enrolled_at: true,
                    class: {
                        select: {
                            id: true,
                            course_id: true,
                            semester_id: true,
                            name: true,
                            quota: true,
                            day_of_week: true,
                            time_slot_id: true,
                            room_id: true,
                            course: { select: { id: true, code: true, name: true } },
                            semester: { select: { id: true, name: true } },
                            time_slot: { select: { id: true, label: true, start_time: true, end_time: true } },
                            room: { select: { id: true, code: true, name: true } },
                            assistants: {
                                select: { user: { select: { id: true, name: true } } }
                            }
                        }
                    }
                },
                orderBy: { class: { semester: { id: 'desc' } } },
                skip,
                take: limit
            }),
            prisma.enrollment.count({ where: { user_id: userId } })
        ]);

        const classes = enrollments.map(e => ({
            ...e.class,
            day_name: DAY_NAMES[e.class.day_of_week],
            enrolled_at: e.enrolled_at
        }));

        return apiResponse.success(res, {
            data: classes,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'My classes retrieved.');
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
 * Body: { session_id, reason, file_name, file_data (base64) }
 */
export const submitPermission = async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id, reason, file_name, file_data } = req.body;

        if (!session_id || !reason || !file_name || !file_data) {
            return apiResponse.error(res, 'Session ID, reason, file name, and file data are required.', 400);
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
            // Delete old file if exists
            if (existingRequest.file_data) {
                const parsed = parseMinioUrl(existingRequest.file_data);
                if (parsed) {
                    await deleteFile(parsed.bucket, parsed.filename);
                }
            }
        }

        // Upload file to MinIO
        const fileUrl = await uploadBase64File(
            file_data,
            BUCKETS.PERMISSIONS,
            `student-${userId}-session-${session_id}`
        );

        const permission = await prisma.permissionRequest.upsert({
            where: {
                student_id_session_id: {
                    student_id: userId,
                    session_id: parseInt(session_id)
                }
            },
            update: {
                file_name,
                file_data: fileUrl,
                reason,
                status: 'PENDING',
                updated_at: new Date()
            },
            create: {
                student_id: userId,
                session_id: parseInt(session_id),
                file_name,
                file_data: fileUrl,
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

// =============================================================================
// MY ATTENDANCE RECAP (Personal attendance across all classes)
// =============================================================================

/**
 * Get my attendance recap for all enrolled classes
 * GET /api/student/my-recap
 */
export const getMyAttendanceRecap = async (req, res) => {
    try {
        const userId = req.user.id;

        // Get all enrollments with attendance data
        const enrollments = await prisma.enrollment.findMany({
            where: { user_id: userId },
            include: {
                class: {
                    include: {
                        course: true,
                        semester: true,
                        sessions: { orderBy: { session_number: 'asc' } }
                    }
                },
                attendances: {
                    include: { session: true }
                }
            }
        });

        // Build recap for each class
        const recap = enrollments.map(enrollment => {
            const cls = enrollment.class;

            // Build attendance grid (P1-P11)
            const sessions = cls.sessions.map(session => {
                const attendance = enrollment.attendances.find(
                    a => a.session_id === session.id
                );
                return {
                    session_number: session.session_number,
                    topic: session.topic,
                    type: session.type,
                    status: attendance?.status || null,
                    grade: attendance?.grade || null,
                    submitted_at: attendance?.submitted_at
                };
            });

            // Calculate stats
            const presentCount = sessions.filter(s => s.status === 'HADIR').length;
            const totalSessions = sessions.filter(s => s.status !== null).length;
            const grades = sessions.filter(s => s.grade !== null).map(s => s.grade);
            const avgGrade = grades.length > 0
                ? grades.reduce((a, b) => a + b, 0) / grades.length
                : null;

            return {
                class_id: cls.id,
                class_name: cls.name,
                course: cls.course,
                semester: cls.semester,
                sessions,
                stats: {
                    present_count: presentCount,
                    total_sessions: totalSessions,
                    attendance_percentage: totalSessions > 0
                        ? Math.round((presentCount / totalSessions) * 100)
                        : 0,
                    average_grade: avgGrade ? Math.round(avgGrade * 10) / 10 : null
                }
            };
        });

        return apiResponse.success(res, recap, 'My attendance recap retrieved.');
    } catch (error) {
        console.error('Get my attendance recap error:', error);
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
    getMyPermissions,
    getMyAttendanceRecap
};

