import prisma from '../lib/prisma.js';
import { apiResponse } from '../utils/helpers.js';

// Get class grading data (all sessions with students)
export const getClassGrades = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId);
        
        // Get class with sessions and enrollments
        const classData = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                course: true,
                semester: true,
                time_slot: true,
                room: true,
                sessions: {
                    orderBy: { session_number: 'asc' }
                },
                enrollments: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                nim: true,
                                email: true
                            }
                        },
                        attendances: {
                            include: {
                                session: true
                            }
                        }
                    },
                    orderBy: {
                        user: { name: 'asc' }
                    }
                }
            }
        });

        if (!classData) {
            return apiResponse.error(res, 'Class not found', 404);
        }

        // Format data for grading table
        const students = classData.enrollments.map(enrollment => {
            const grades = {};
            
            enrollment.attendances.forEach(att => {
                // Can edit if: HADIR, INHAL, or IZIN_* (with verified permission)
                const canEdit = att.status === 'HADIR' || att.status === 'INHAL';
                
                grades[att.session_id] = {
                    status: att.status,
                    grade: att.grade,
                    canEdit
                };
            });

            return {
                id: enrollment.user.id,
                name: enrollment.user.name,
                nim: enrollment.user.nim,
                email: enrollment.user.email,
                grades
            };
        });

        return apiResponse.success(res, {
            class: {
                id: classData.id,
                name: classData.name,
                course: classData.course,
                semester: classData.semester,
                time_slot: classData.time_slot,
                room: classData.room
            },
            sessions: classData.sessions,
            students,
            totalSessions: classData.sessions.length,
            totalStudents: students.length
        });
    } catch (error) {
        console.error('Get class grades error:', error);
        return apiResponse.error(res, 'Failed to get class grades', 500);
    }
};

// Update single grade
export const updateGrade = async (req, res) => {
    try {
        const { studentId, sessionId, grade } = req.body;

        if (!studentId || !sessionId || grade === undefined) {
            return apiResponse.error(res, 'Missing required fields', 400);
        }

        // Validate grade range (0-100)
        if (grade < 0 || grade > 100) {
            return apiResponse.error(res, 'Grade must be between 0 and 100', 400);
        }

        // Get session to find class_id
        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found', 404);
        }

        // Check if student is enrolled
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: parseInt(studentId)
                }
            }
        });

        if (!enrollment) {
            return apiResponse.error(res, 'Student not enrolled in this class', 404);
        }

        // Get or create attendance record
        const attendance = await prisma.studentAttendance.findUnique({
            where: {
                enrollment_class_id_enrollment_user_id_session_id: {
                    enrollment_class_id: session.class_id,
                    enrollment_user_id: parseInt(studentId),
                    session_id: parseInt(sessionId)
                }
            }
        });

        // Allow grading if: HADIR, INHAL, or IZIN_* (with verified permission)
        const allowedStatuses = ['HADIR', 'INHAL'];
        if (!attendance || !allowedStatuses.includes(attendance.status)) {
            return apiResponse.error(res, `Cannot grade: student status is ${attendance?.status || 'not found'}. Only HADIR and INHAL can be graded.`, 400);
        }

        // Update grade
        const updated = await prisma.studentAttendance.update({
            where: {
                enrollment_class_id_enrollment_user_id_session_id: {
                    enrollment_class_id: session.class_id,
                    enrollment_user_id: parseInt(studentId),
                    session_id: parseInt(sessionId)
                }
            },
            data: {
                grade: parseFloat(grade)
            }
        });

        return apiResponse.success(res, updated, 'Grade updated successfully');
    } catch (error) {
        console.error('Update grade error:', error);
        return apiResponse.error(res, 'Failed to update grade', 500);
    }
};

// Batch update grades for a session
export const updateSessionGrades = async (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId);
        const { grades } = req.body; // Array of { studentId, grade }

        if (!grades || !Array.isArray(grades)) {
            return apiResponse.error(res, 'Invalid grades data', 400);
        }

        // Get session
        const session = await prisma.classSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found', 404);
        }

        // Update grades in transaction
        const results = await prisma.$transaction(
            grades.map(({ studentId, grade }) => {
                // Validate grade
                if (grade < 0 || grade > 100) {
                    throw new Error(`Invalid grade for student ${studentId}: ${grade}`);
                }

                return prisma.studentAttendance.updateMany({
                    where: {
                        enrollment_class_id: session.class_id,
                        enrollment_user_id: parseInt(studentId),
                        session_id: sessionId,
                        status: { in: ['HADIR', 'INHAL'] } // Only update if HADIR or INHAL
                    },
                    data: {
                        grade: parseFloat(grade)
                    }
                });
            })
        );

        const updated = results.reduce((sum, r) => sum + r.count, 0);

        return apiResponse.success(res, { updated }, `Updated ${updated} grades`);
    } catch (error) {
        console.error('Batch update grades error:', error);
        return apiResponse.error(res, error.message || 'Failed to update grades', 500);
    }
};

// Get session grading data
export const getSessionGrades = async (req, res) => {
    try {
        const sessionId = parseInt(req.params.sessionId);

        const session = await prisma.classSession.findUnique({
            where: { id: sessionId },
            include: {
                class: {
                    include: {
                        course: true,
                        enrollments: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        name: true,
                                        nim: true,
                                        email: true
                                    }
                                },
                                attendances: {
                                    where: { session_id: sessionId }
                                }
                            },
                            orderBy: {
                                user: { name: 'asc' }
                            }
                        }
                    }
                }
            }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found', 404);
        }

        const students = session.class.enrollments.map(enrollment => {
            const attendance = enrollment.attendances[0];
            const canEdit = attendance && (attendance.status === 'HADIR' || attendance.status === 'INHAL');
            
            return {
                id: enrollment.user.id,
                name: enrollment.user.name,
                nim: enrollment.user.nim,
                email: enrollment.user.email,
                status: attendance?.status || 'ALPHA',
                grade: attendance?.grade || null,
                canEdit
            };
        });

        return apiResponse.success(res, {
            session: {
                id: session.id,
                session_number: session.session_number,
                topic: session.topic,
                type: session.type,
                date: session.date
            },
            class: {
                id: session.class.id,
                name: session.class.name,
                course: session.class.course
            },
            students,
            stats: {
                total: students.length,
                present: students.filter(s => s.status === 'HADIR').length,
                graded: students.filter(s => s.grade !== null).length
            }
        });
    } catch (error) {
        console.error('Get session grades error:', error);
        return apiResponse.error(res, 'Failed to get session grades', 500);
    }
};

// Get grade statistics for a class
export const getClassGradeStats = async (req, res) => {
    try {
        const classId = parseInt(req.params.classId);

        const classData = await prisma.class.findUnique({
            where: { id: classId },
            include: {
                sessions: true,
                enrollments: {
                    include: {
                        attendances: {
                            where: {
                                status: 'HADIR',
                                grade: { not: null }
                            }
                        }
                    }
                }
            }
        });

        if (!classData) {
            return apiResponse.error(res, 'Class not found', 404);
        }

        const stats = {
            totalSessions: classData.sessions.length,
            totalStudents: classData.enrollments.length,
            gradedSessions: 0,
            averageGrade: 0,
            studentStats: []
        };

        // Calculate per-student stats
        classData.enrollments.forEach(enrollment => {
            const grades = enrollment.attendances
                .filter(att => att.grade !== null)
                .map(att => att.grade);

            const average = grades.length > 0
                ? grades.reduce((sum, g) => sum + g, 0) / grades.length
                : null;

            stats.studentStats.push({
                studentId: enrollment.user_id,
                gradedCount: grades.length,
                averageGrade: average
            });
        });

        // Calculate overall average
        const allGrades = stats.studentStats
            .filter(s => s.averageGrade !== null)
            .map(s => s.averageGrade);

        stats.averageGrade = allGrades.length > 0
            ? allGrades.reduce((sum, g) => sum + g, 0) / allGrades.length
            : 0;

        // Count sessions with at least one grade
        const sessionsWithGrades = new Set();
        classData.enrollments.forEach(enrollment => {
            enrollment.attendances.forEach(att => {
                if (att.grade !== null) {
                    sessionsWithGrades.add(att.session_id);
                }
            });
        });
        stats.gradedSessions = sessionsWithGrades.size;

        return apiResponse.success(res, stats);
    } catch (error) {
        console.error('Get grade stats error:', error);
        return apiResponse.error(res, 'Failed to get grade statistics', 500);
    }
};
