import prisma from '../lib/prisma.js';
import { apiResponse } from '../utils/helpers.js';
import { uploadBase64File, BUCKETS } from '../services/minioService.js';

const INHAL_AMOUNT = 30000; // IDR 30,000

// Submit INHAL payment (student)
export const submitInhalPayment = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { sessionId, proofFileName, proofFileData } = req.body;

        if (!sessionId || !proofFileName || !proofFileData) {
            return apiResponse.error(res, 'Missing required fields', 400);
        }

        // Check if session exists
        const session = await prisma.classSession.findUnique({
            where: { id: parseInt(sessionId) },
            include: { class: true }
        });

        if (!session) {
            return apiResponse.error(res, 'Session not found', 404);
        }

        // Check if student is enrolled
        const enrollment = await prisma.enrollment.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: studentId
                }
            }
        });

        if (!enrollment) {
            return apiResponse.error(res, 'You are not enrolled in this class', 404);
        }

        // Check attendance status - must be ALPHA or IZIN_*
        const attendance = await prisma.studentAttendance.findUnique({
            where: {
                enrollment_class_id_enrollment_user_id_session_id: {
                    enrollment_class_id: session.class_id,
                    enrollment_user_id: studentId,
                    session_id: parseInt(sessionId)
                }
            }
        });

        if (!attendance) {
            return apiResponse.error(res, 'Attendance record not found', 404);
        }

        if (attendance.status === 'HADIR' || attendance.status === 'INHAL' || attendance.status === 'PENDING') {
            return apiResponse.error(res, `Cannot apply for INHAL with status: ${attendance.status}`, 400);
        }

        // Check if INHAL payment already exists
        const existing = await prisma.inhalPayment.findUnique({
            where: {
                student_id_session_id: {
                    student_id: studentId,
                    session_id: parseInt(sessionId)
                }
            }
        });

        if (existing) {
            return apiResponse.error(res, 'INHAL payment already submitted for this session', 400);
        }

        // Upload proof file to MinIO
        const proofFileUrl = await uploadBase64File(
            proofFileData,
            BUCKETS.PAYMENTS,
            `inhal-${studentId}-${sessionId}-${proofFileName}`
        );

        // Create INHAL payment
        const inhalPayment = await prisma.inhalPayment.create({
            data: {
                student_id: studentId,
                session_id: parseInt(sessionId),
                amount: INHAL_AMOUNT,
                proof_file_name: proofFileName,
                proof_file_url: proofFileUrl,
                status: 'PENDING'
            },
            include: {
                session: {
                    include: {
                        class: {
                            include: {
                                course: true
                            }
                        }
                    }
                }
            }
        });

        return apiResponse.success(res, inhalPayment, 'INHAL payment submitted successfully', 201);
    } catch (error) {
        console.error('Submit INHAL payment error:', error);
        return apiResponse.error(res, 'Failed to submit INHAL payment', 500);
    }
};

// Get my INHAL payments (student)
export const getMyInhalPayments = async (req, res) => {
    try {
        const studentId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            prisma.inhalPayment.findMany({
                where: { student_id: studentId },
                include: {
                    session: {
                        include: {
                            class: {
                                include: {
                                    course: true
                                }
                            }
                        }
                    },
                    verified_by: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.inhalPayment.count({
                where: { student_id: studentId }
            })
        ]);

        return apiResponse.success(res, {
            data: payments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get my INHAL payments error:', error);
        return apiResponse.error(res, 'Failed to get INHAL payments', 500);
    }
};

// Get INHAL payment status for a session (student)
export const getInhalPaymentStatus = async (req, res) => {
    try {
        const studentId = req.user.id;
        const sessionId = parseInt(req.params.sessionId);

        const payment = await prisma.inhalPayment.findUnique({
            where: {
                student_id_session_id: {
                    student_id: studentId,
                    session_id: sessionId
                }
            },
            include: {
                session: {
                    include: {
                        class: {
                            include: {
                                course: true
                            }
                        }
                    }
                },
                verified_by: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return apiResponse.success(res, payment);
    } catch (error) {
        console.error('Get INHAL payment status error:', error);
        return apiResponse.error(res, 'Failed to get INHAL payment status', 500);
    }
};

// Get all INHAL payments (admin)
export const getAllInhalPayments = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const status = req.query.status || '';
        const skip = (page - 1) * limit;

        const where = status ? { status } : {};

        const [payments, total] = await Promise.all([
            prisma.inhalPayment.findMany({
                where,
                include: {
                    student: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            nim: true
                        }
                    },
                    session: {
                        include: {
                            class: {
                                include: {
                                    course: true
                                }
                            }
                        }
                    },
                    verified_by: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.inhalPayment.count({ where })
        ]);

        return apiResponse.success(res, {
            data: payments,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get all INHAL payments error:', error);
        return apiResponse.error(res, 'Failed to get INHAL payments', 500);
    }
};

// Verify INHAL payment (admin)
export const verifyInhalPayment = async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        const adminId = req.user.id;

        const payment = await prisma.inhalPayment.findUnique({
            where: { id: paymentId },
            include: {
                session: true
            }
        });

        if (!payment) {
            return apiResponse.error(res, 'INHAL payment not found', 404);
        }

        if (payment.status !== 'PENDING') {
            return apiResponse.error(res, 'INHAL payment already processed', 400);
        }

        // Update payment status and attendance status in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update payment
            const updatedPayment = await tx.inhalPayment.update({
                where: { id: paymentId },
                data: {
                    status: 'VERIFIED',
                    verified_by_id: adminId,
                    verified_at: new Date()
                }
            });

            // Update attendance status to INHAL
            await tx.studentAttendance.updateMany({
                where: {
                    enrollment_user_id: payment.student_id,
                    session_id: payment.session_id
                },
                data: {
                    status: 'INHAL'
                }
            });

            return updatedPayment;
        });

        return apiResponse.success(res, result, 'INHAL payment verified and attendance updated');
    } catch (error) {
        console.error('Verify INHAL payment error:', error);
        return apiResponse.error(res, 'Failed to verify INHAL payment', 500);
    }
};

// Reject INHAL payment (admin)
export const rejectInhalPayment = async (req, res) => {
    try {
        const paymentId = parseInt(req.params.paymentId);
        const adminId = req.user.id;

        const payment = await prisma.inhalPayment.findUnique({
            where: { id: paymentId }
        });

        if (!payment) {
            return apiResponse.error(res, 'INHAL payment not found', 404);
        }

        if (payment.status !== 'PENDING') {
            return apiResponse.error(res, 'INHAL payment already processed', 400);
        }

        const updated = await prisma.inhalPayment.update({
            where: { id: paymentId },
            data: {
                status: 'REJECTED',
                verified_by_id: adminId,
                verified_at: new Date()
            }
        });

        return apiResponse.success(res, updated, 'INHAL payment rejected');
    } catch (error) {
        console.error('Reject INHAL payment error:', error);
        return apiResponse.error(res, 'Failed to reject INHAL payment', 500);
    }
};

// Get INHAL statistics (admin)
export const getInhalStats = async (req, res) => {
    try {
        const [total, pending, verified, rejected] = await Promise.all([
            prisma.inhalPayment.count(),
            prisma.inhalPayment.count({ where: { status: 'PENDING' } }),
            prisma.inhalPayment.count({ where: { status: 'VERIFIED' } }),
            prisma.inhalPayment.count({ where: { status: 'REJECTED' } })
        ]);

        const totalRevenue = verified * INHAL_AMOUNT;

        return apiResponse.success(res, {
            total,
            pending,
            verified,
            rejected,
            totalRevenue,
            inhalAmount: INHAL_AMOUNT
        });
    } catch (error) {
        console.error('Get INHAL stats error:', error);
        return apiResponse.error(res, 'Failed to get INHAL statistics', 500);
    }
};
