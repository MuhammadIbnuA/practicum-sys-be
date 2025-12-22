/**
 * Teaching Controller
 * Handles assistant schedule, check-in, attendance approval, and student management
 */

import prisma from '../lib/prisma.js';
import { apiResponse } from '../utils/helpers.js';

// Day names for display
const DAY_NAMES = { 1: 'Senin', 2: 'Selasa', 3: 'Rabu', 4: 'Kamis', 5: 'Jumat' };

// =============================================================================
// SCHEDULE
// =============================================================================

/**
 * Get classes assigned to teach
 * GET /api/teaching/schedule
 */
export const getSchedule = async (req, res) => {
    try {
        const userId = req.user.id;

        const assignments = await prisma.classAssistant.findMany({
            where: { user_id: userId },
            include: {
                class: {
                    include: {
                        course: true,
                        semester: true,
                        time_slot: true,
                        room: true,
                        sessions: { orderBy: { session_number: 'asc' } },
                        _count: { select: { enrollments: true } }
                    }
                }
            }
        });

        const schedule = assignments.map(a => ({
            ...a.class,
            day_name: DAY_NAMES[a.class.day_of_week],
            student_count: a.class._count.enrollments
        }));

        return apiResponse.success(res, schedule, 'Teaching schedule retrieved.');
    } catch (error) {
        console.error('Get schedule error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// CHECK-IN
// =============================================================================

/**
 * Check-in as assistant for a session
 * POST /api/teaching/check-in
 */
export const checkIn = async (req, res) => {
    try {
        const userId = req.user.id;
        const { session_id } = req.body;

        if (!session_id) {
            return apiResponse.error(res, 'Session ID is required.', 400);
        }

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(session_id) },
            include: { class: true }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: userId
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'You are not assigned as assistant for this class.', 403);
        }

        const existing = await prisma.assistantAttendance.findUnique({
            where: {
                user_id_session_id: {
                    user_id: userId,
                    session_id: parseInt(session_id)
                }
            }
        });

        if (existing) {
            return apiResponse.error(res, 'Already checked in for this session.', 409);
        }

        const attendance = await prisma.assistantAttendance.create({
            data: {
                user_id: userId,
                session_id: parseInt(session_id),
                status: 'HADIR'
            },
            include: {
                session: { include: { class: { include: { course: true } } } }
            }
        });

        return apiResponse.success(res, attendance, 'Check-in successful.', 201);
    } catch (error) {
        console.error('Check-in error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// PENDING ATTENDANCE APPROVAL
// =============================================================================

/**
 * Get pending attendance submissions for a session
 * GET /api/teaching/sessions/:sessionId/pending
 */
export const getPendingAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: { class: { include: { course: true } } }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        // Verify assistant access
        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: req.user.id
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'Access denied.', 403);
        }

        // Get pending attendance submissions
        const pending = await prisma.studentAttendance.findMany({
            where: {
                session_id: parseInt(sessionId),
                status: 'PENDING'
            },
            include: {
                enrollment: {
                    include: {
                        user: { select: { id: true, name: true, email: true } }
                    }
                }
            },
            orderBy: { submitted_at: 'asc' }
        });

        const submissions = pending.map(p => ({
            id: p.id,
            student: p.enrollment.user,
            submitted_at: p.submitted_at,
            status: p.status
        }));

        return apiResponse.success(res, {
            session,
            pending_count: submissions.length,
            submissions
        }, 'Pending attendance retrieved.');
    } catch (error) {
        console.error('Get pending attendance error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Approve a student attendance submission
 * PUT /api/teaching/attendance/:attendanceId/approve
 */
export const approveAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const userId = req.user.id;

        const attendance = await prisma.studentAttendance.findUnique({
            where: { id: parseInt(attendanceId) },
            include: {
                session: { include: { class: true } },
                enrollment: {
                    include: { user: { select: { id: true, name: true } } }
                }
            }
        });

        if (!attendance) {
            return apiResponse.error(res, 'Attendance record not found.', 404);
        }

        if (attendance.status !== 'PENDING') {
            return apiResponse.error(res, 'This attendance is not pending approval.', 400);
        }

        // Verify assistant access
        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: attendance.session.class_id,
                    user_id: userId
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'Access denied.', 403);
        }

        // Approve the attendance
        const updated = await prisma.studentAttendance.update({
            where: { id: parseInt(attendanceId) },
            data: {
                status: 'HADIR',
                approved_by_id: userId,
                approved_at: new Date()
            },
            include: {
                enrollment: {
                    include: { user: { select: { id: true, name: true } } }
                }
            }
        });

        return apiResponse.success(res, updated, 'Attendance approved.');
    } catch (error) {
        console.error('Approve attendance error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Reject a student attendance submission
 * PUT /api/teaching/attendance/:attendanceId/reject
 */
export const rejectAttendance = async (req, res) => {
    try {
        const { attendanceId } = req.params;
        const userId = req.user.id;

        const attendance = await prisma.studentAttendance.findUnique({
            where: { id: parseInt(attendanceId) },
            include: { session: { include: { class: true } } }
        });

        if (!attendance) {
            return apiResponse.error(res, 'Attendance record not found.', 404);
        }

        if (attendance.status !== 'PENDING') {
            return apiResponse.error(res, 'This attendance is not pending approval.', 400);
        }

        // Verify assistant access
        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: attendance.session.class_id,
                    user_id: userId
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'Access denied.', 403);
        }

        // Reject - mark as ALPHA
        const updated = await prisma.studentAttendance.update({
            where: { id: parseInt(attendanceId) },
            data: {
                status: 'REJECTED',
                approved_by_id: userId,
                approved_at: new Date()
            }
        });

        return apiResponse.success(res, updated, 'Attendance rejected.');
    } catch (error) {
        console.error('Reject attendance error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ROSTER & ATTENDANCE
// =============================================================================

/**
 * Get student roster for a session
 * GET /api/teaching/sessions/:sessionId/roster
 */
export const getSessionRoster = async (req, res) => {
    try {
        const { sessionId } = req.params;

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: { class: { include: { course: true, time_slot: true, room: true } } }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: req.user.id
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'Access denied.', 403);
        }

        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: session.class_id },
            include: {
                user: { select: { id: true, name: true, email: true } },
                attendances: { where: { session_id: parseInt(sessionId) } }
            },
            orderBy: { user: { name: 'asc' } }
        });

        const roster = enrollments.map(e => ({
            student_id: e.user.id,
            student_name: e.user.name,
            student_email: e.user.email,
            enrolled_at: e.enrolled_at,
            attendance: e.attendances.length > 0 ? {
                id: e.attendances[0].id,
                status: e.attendances[0].status,
                grade: e.attendances[0].grade,
                submitted_at: e.attendances[0].submitted_at,
                approved_at: e.attendances[0].approved_at
            } : null
        }));

        // Count by status
        const statusCounts = {
            pending: roster.filter(r => r.attendance?.status === 'PENDING').length,
            hadir: roster.filter(r => r.attendance?.status === 'HADIR').length,
            alpha: roster.filter(r => !r.attendance || r.attendance.status === 'ALPHA').length
        };

        return apiResponse.success(res, {
            session: {
                id: session.id,
                session_number: session.session_number,
                date: session.date,
                topic: session.topic,
                type: session.type
            },
            class: {
                ...session.class,
                day_name: DAY_NAMES[session.class.day_of_week]
            },
            student_count: roster.length,
            status_counts: statusCounts,
            roster
        }, 'Session roster retrieved.');
    } catch (error) {
        console.error('Get roster error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Batch update student attendance and grades
 * PUT /api/teaching/sessions/:sessionId/update-batch
 */
export const updateBatchAttendance = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { updates } = req.body;
        const userId = req.user.id;

        if (!updates || !Array.isArray(updates)) {
            return apiResponse.error(res, 'Updates array is required.', 400);
        }

        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: userId
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'Access denied.', 403);
        }

        const results = await prisma.$transaction(async (tx) => {
            const processed = [];

            for (const update of updates) {
                const { studentId, status, grade } = update;

                const enrollment = await tx.enrollment.findUnique({
                    where: {
                        class_id_user_id: {
                            class_id: session.class_id,
                            user_id: parseInt(studentId)
                        }
                    }
                });

                if (!enrollment) {
                    processed.push({ studentId, success: false, error: 'Student not enrolled.' });
                    continue;
                }

                // Grade only allowed for HADIR
                let finalGrade = grade !== undefined ? parseFloat(grade) : null;
                if (status !== 'HADIR' && finalGrade !== null) {
                    finalGrade = null;
                }

                const attendance = await tx.studentAttendance.upsert({
                    where: {
                        enrollment_class_id_enrollment_user_id_session_id: {
                            enrollment_class_id: session.class_id,
                            enrollment_user_id: parseInt(studentId),
                            session_id: parseInt(sessionId)
                        }
                    },
                    update: {
                        status: status || 'ALPHA',
                        grade: finalGrade,
                        approved_by_id: userId,
                        approved_at: new Date()
                    },
                    create: {
                        enrollment_class_id: session.class_id,
                        enrollment_user_id: parseInt(studentId),
                        session_id: parseInt(sessionId),
                        status: status || 'ALPHA',
                        grade: finalGrade,
                        approved_by_id: userId,
                        approved_at: new Date()
                    }
                });

                processed.push({
                    studentId,
                    success: true,
                    attendance: { status: attendance.status, grade: attendance.grade }
                });
            }

            return processed;
        });

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return apiResponse.success(res, results, `Batch update: ${successCount} updated, ${failCount} failed.`);
    } catch (error) {
        console.error('Batch update error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get sessions for a class I'm teaching
 * GET /api/teaching/classes/:classId/sessions
 */
export const getClassSessions = async (req, res) => {
    try {
        const { classId } = req.params;

        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: parseInt(classId),
                    user_id: req.user.id
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'Access denied. Not assigned to this class.', 403);
        }

        const sessions = await prisma.classSession.findMany({
            where: { class_id: parseInt(classId) },
            include: {
                class: { include: { course: true, time_slot: true, room: true } },
                _count: { select: { studentAttendances: true, assistantAttendances: true } }
            },
            orderBy: { session_number: 'asc' }
        });

        // Add pending count for each session
        const sessionsWithPending = await Promise.all(sessions.map(async (s) => {
            const pendingCount = await prisma.studentAttendance.count({
                where: { session_id: s.id, status: 'PENDING' }
            });
            return { ...s, pending_count: pendingCount };
        }));

        return apiResponse.success(res, sessionsWithPending, 'Class sessions retrieved.');
    } catch (error) {
        console.error('Get class sessions error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ATTENDANCE RECAP (Grid View)
// =============================================================================

/**
 * Get attendance recap for a class (spreadsheet-like grid)
 * GET /api/teaching/classes/:classId/recap
 * Returns: { class, sessions[], students: [{ name, email, attendances: {1: 'HADIR', 2: 'ALPHA', ...} }] }
 */
export const getAttendanceRecap = async (req, res) => {
    try {
        const { classId } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.is_admin;

        // Check access (admin can see all, assistant only their classes)
        if (!isAdmin) {
            const assignment = await prisma.classAssistant.findUnique({
                where: {
                    class_id_user_id: {
                        class_id: parseInt(classId),
                        user_id: userId
                    }
                }
            });

            if (!assignment) {
                return apiResponse.error(res, 'Access denied. Not assigned to this class.', 403);
            }
        }

        // Get class with sessions
        const classData = await prisma.class.findUnique({
            where: { id: parseInt(classId) },
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                sessions: { orderBy: { session_number: 'asc' } },
                assistants: { include: { user: { select: { id: true, name: true } } } }
            }
        });

        if (!classData) {
            return apiResponse.error(res, 'Class not found.', 404);
        }

        // Get all enrollments with attendance
        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: parseInt(classId) },
            include: {
                user: { select: { id: true, name: true, email: true } },
                attendances: {
                    include: { session: true }
                }
            },
            orderBy: { user: { name: 'asc' } }
        });

        // Build recap grid
        const students = enrollments.map(enrollment => {
            // Create attendance map: session_number -> { status, grade }
            const attendanceMap = {};
            for (const session of classData.sessions) {
                const att = enrollment.attendances.find(a => a.session_id === session.id);
                attendanceMap[session.session_number] = att ? {
                    status: att.status,
                    grade: att.grade
                } : null;
            }

            return {
                id: enrollment.user.id,
                name: enrollment.user.name,
                email: enrollment.user.email,
                attendances: attendanceMap
            };
        });

        // Calculate summary stats per session
        const sessionStats = classData.sessions.map(session => {
            let hadir = 0, alpha = 0, pending = 0, izin = 0;
            for (const student of students) {
                const att = student.attendances[session.session_number];
                if (!att) alpha++;
                else if (att.status === 'HADIR') hadir++;
                else if (att.status === 'PENDING') pending++;
                else if (att.status === 'ALPHA' || att.status === 'REJECTED') alpha++;
                else izin++;
            }
            return { session_number: session.session_number, hadir, alpha, pending, izin };
        });

        const recap = {
            class: {
                id: classData.id,
                name: classData.name,
                course: classData.course,
                semester: classData.semester,
                day_name: DAY_NAMES[classData.day_of_week],
                time_slot: classData.time_slot,
                room: classData.room,
                assistants: classData.assistants.map(a => a.user)
            },
            sessions: classData.sessions.map(s => ({
                id: s.id,
                session_number: s.session_number,
                topic: s.topic,
                type: s.type
            })),
            students,
            stats: sessionStats,
            total_students: students.length
        };

        return apiResponse.success(res, recap, 'Attendance recap retrieved.');
    } catch (error) {
        console.error('Get attendance recap error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// FINALIZE SESSION (Rekap)
// =============================================================================

/**
 * Finalize a session - mark all unmarked students as ALPHA
 * POST /api/teaching/sessions/:sessionId/finalize
 */
export const finalizeSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const userId = req.user.id;

        // Get session with class info
        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: { class: true }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found.', 404);
        }

        // Check if already finalized
        if (session.is_finalized) {
            return apiResponse.error(res, 'Session already finalized.', 400);
        }

        // Check if user is assistant of this class
        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: userId
                }
            }
        });

        if (!assignment) {
            return apiResponse.error(res, 'You are not assigned as assistant for this class.', 403);
        }

        // Get all enrolled students (using composite key)
        const enrollments = await prisma.enrollment.findMany({
            where: { class_id: session.class_id },
            select: { class_id: true, user_id: true }
        });

        // Get existing attendance records for this session
        const existingAttendances = await prisma.studentAttendance.findMany({
            where: { session_id: parseInt(sessionId) },
            select: { enrollment_class_id: true, enrollment_user_id: true }
        });

        // Create set of existing attendance user_ids
        const usersWithAttendance = new Set(existingAttendances.map(a => a.enrollment_user_id));

        // Find enrollments without attendance
        const enrollmentsWithoutAttendance = enrollments.filter(
            e => !usersWithAttendance.has(e.user_id)
        );

        // Create ALPHA records for students without attendance
        if (enrollmentsWithoutAttendance.length > 0) {
            await prisma.studentAttendance.createMany({
                data: enrollmentsWithoutAttendance.map(e => ({
                    enrollment_class_id: e.class_id,
                    enrollment_user_id: e.user_id,
                    session_id: parseInt(sessionId),
                    status: 'ALPHA',
                    submitted_at: new Date()
                }))
            });
        }

        // Mark session as finalized
        await prisma.classSession.update({
            where: { id: parseInt(sessionId) },
            data: { is_finalized: true }
        });

        return apiResponse.success(res, {
            markedAlpha: enrollmentsWithoutAttendance.length,
            totalStudents: enrollments.length
        }, `Session finalized. ${enrollmentsWithoutAttendance.length} students marked as ALPHA.`);
    } catch (error) {
        console.error('Finalize session error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

export default {
    getSchedule,
    checkIn,
    getPendingAttendance,
    approveAttendance,
    rejectAttendance,
    getSessionRoster,
    updateBatchAttendance,
    getClassSessions,
    getAttendanceRecap,
    finalizeSession
};


