/**
 * Payment Controller
 * Handles class enrollment payments and verification
 */

import prisma from '../lib/prisma.js';
import { apiResponse } from '../utils/helpers.js';

const PAYMENT_AMOUNT = 5000; // IDR
const PAYMENT_EXPIRY_DAYS = 7;

// =============================================================================
// STUDENT PAYMENT ENDPOINTS
// =============================================================================

/**
 * Submit payment proof for class enrollment
 * POST /api/payment/submit
 * Body: { classId, proofFileName, proofFileData (base64) }
 */
export const submitPayment = async (req, res) => {
    try {
        const { classId, proofFileName, proofFileData } = req.body;
        const studentId = req.user.id;

        if (!classId || !proofFileName || !proofFileData) {
            return apiResponse.error(res, 'Class ID, proof file name, and proof file data are required.', 400);
        }

        // Verify class exists
        const classExists = await prisma.class.findUnique({
            where: { id: parseInt(classId) }
        });

        if (!classExists) {
            return apiResponse.error(res, 'Class not found.', 404);
        }

        // Create or update payment
        const payment = await prisma.payment.upsert({
            where: {
                student_id_class_id: {
                    student_id: studentId,
                    class_id: parseInt(classId)
                }
            },
            update: {
                proof_file_name: proofFileName,
                proof_file_url: proofFileData,
                status: 'PENDING',
                updated_at: new Date()
            },
            create: {
                student_id: studentId,
                class_id: parseInt(classId),
                amount: PAYMENT_AMOUNT,
                proof_file_name: proofFileName,
                proof_file_url: proofFileData,
                status: 'PENDING'
            },
            include: {
                student: { select: { id: true, name: true, email: true } },
                class: { include: { course: true } }
            }
        });

        return apiResponse.success(res, payment, 'Payment proof submitted. Waiting for admin verification.', 201);
    } catch (error) {
        console.error('Submit payment error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get payment status for a class
 * GET /api/payment/status/:classId
 */
export const getPaymentStatus = async (req, res) => {
    try {
        const { classId } = req.params;
        const studentId = req.user.id;

        const payment = await prisma.payment.findUnique({
            where: {
                student_id_class_id: {
                    student_id: studentId,
                    class_id: parseInt(classId)
                }
            },
            include: {
                class: { include: { course: true } }
            }
        });

        if (!payment) {
            return apiResponse.success(res, null, 'No payment found for this class.');
        }

        return apiResponse.success(res, payment, 'Payment status retrieved.');
    } catch (error) {
        console.error('Get payment status error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get all pending payments for student
 * GET /api/payment/my-payments
 */
export const getMyPayments = async (req, res) => {
    try {
        const studentId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where: { student_id: studentId },
                include: {
                    class: { include: { course: true, time_slot: true, room: true } }
                },
                orderBy: { created_at: 'desc' },
                skip,
                take: limit
            }),
            prisma.payment.count({ where: { student_id: studentId } })
        ]);

        return apiResponse.success(res, {
            data: payments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'Payments retrieved.');
    } catch (error) {
        console.error('Get my payments error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

// =============================================================================
// ADMIN PAYMENT VERIFICATION ENDPOINTS
// =============================================================================

/**
 * Get all pending payments for verification
 * GET /api/admin/payments
 */
export const getPendingPayments = async (req, res) => {
    try {
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;
        const skip = (page - 1) * limit;

        // Get active semester
        const activeSemester = await prisma.semester.findFirst({
            where: { is_active: true }
        });

        if (!activeSemester) {
            return apiResponse.success(res, {
                data: [],
                pagination: { page, limit, total: 0, pages: 0 }
            }, 'Payments retrieved.');
        }

        const where = {
            class: { semester_id: activeSemester.id }
        };
        if (status) {
            where.status = status.toUpperCase();
        }

        let payments, total;

        try {
            [payments, total] = await Promise.all([
                prisma.payment.findMany({
                    where,
                    include: {
                        student: { select: { id: true, name: true, email: true, nim: true } },
                        class: { include: { course: true, time_slot: true, room: true } },
                        verified_by: { select: { id: true, name: true } }
                    },
                    orderBy: { created_at: 'desc' },
                    skip,
                    take: limit
                }),
                prisma.payment.count({ where })
            ]);
        } catch (err) {
            // If payments table doesn't exist, return empty list
            if (err.code === 'P2021') {
                console.log('Payment table does not exist yet');
                payments = [];
                total = 0;
            } else {
                // Log the actual error for debugging
                console.error('Payment query error:', err.code, err.message);
                throw err;
            }
        }

        return apiResponse.success(res, {
            data: payments,
            pagination: { page, limit, total, pages: Math.ceil(total / limit) }
        }, 'Payments retrieved.');
    } catch (error) {
        console.error('Get pending payments error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Verify payment and create enrollment
 * PUT /api/admin/payments/:paymentId/verify
 */
export const verifyPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const adminId = req.user.id;

        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(paymentId) },
            include: { class: true }
        });

        if (!payment) {
            return apiResponse.error(res, 'Payment not found.', 404);
        }

        if (payment.status !== 'PENDING') {
            return apiResponse.error(res, 'Payment is not pending.', 400);
        }

        // Check class quota
        const enrollmentCount = await prisma.enrollment.count({
            where: { class_id: payment.class_id }
        });

        if (enrollmentCount >= payment.class.quota) {
            return apiResponse.error(res, 'Class is full. Cannot enroll student.', 409);
        }

        // Verify payment and create enrollment in transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update payment status
            const updatedPayment = await tx.payment.update({
                where: { id: parseInt(paymentId) },
                data: {
                    status: 'VERIFIED',
                    verified_by_id: adminId,
                    verified_at: new Date()
                }
            });

            // Create enrollment
            const enrollment = await tx.enrollment.create({
                data: {
                    class_id: payment.class_id,
                    user_id: payment.student_id
                },
                include: {
                    class: { include: { course: true } },
                    user: { select: { id: true, name: true, email: true } }
                }
            });

            return { payment: updatedPayment, enrollment };
        });

        return apiResponse.success(res, result, 'Payment verified and student enrolled.');
    } catch (error) {
        console.error('Verify payment error:', error);
        if (error.code === 'P2002') {
            return apiResponse.error(res, 'Student is already enrolled in this class.', 409);
        }
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Reject payment
 * PUT /api/admin/payments/:paymentId/reject
 */
export const rejectPayment = async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { reason } = req.body;

        const payment = await prisma.payment.findUnique({
            where: { id: parseInt(paymentId) }
        });

        if (!payment) {
            return apiResponse.error(res, 'Payment not found.', 404);
        }

        if (payment.status !== 'PENDING') {
            return apiResponse.error(res, 'Payment is not pending.', 400);
        }

        const updated = await prisma.payment.update({
            where: { id: parseInt(paymentId) },
            data: { status: 'REJECTED' },
            include: {
                student: { select: { id: true, name: true, email: true } },
                class: { include: { course: true } }
            }
        });

        return apiResponse.success(res, updated, 'Payment rejected.');
    } catch (error) {
        console.error('Reject payment error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get payment statistics
 * GET /api/admin/payments/stats
 */
export const getPaymentStats = async (req, res) => {
    try {
        // Get active semester
        const activeSemester = await prisma.semester.findFirst({
            where: { is_active: true }
        });

        if (!activeSemester) {
            return apiResponse.success(res, {
                byStatus: [],
                totalVerified: 0
            }, 'Payment statistics retrieved.');
        }

        const stats = await prisma.payment.groupBy({
            by: ['status'],
            where: {
                class: { semester_id: activeSemester.id }
            },
            _count: true
        });

        const totalAmount = await prisma.payment.aggregate({
            where: { 
                status: 'VERIFIED',
                class: { semester_id: activeSemester.id }
            },
            _sum: { amount: true }
        });

        return apiResponse.success(res, {
            byStatus: stats,
            totalVerified: totalAmount._sum.amount || 0
        }, 'Payment statistics retrieved.');
    } catch (error) {
        console.error('Get payment stats error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

export default {
    submitPayment,
    getPaymentStatus,
    getMyPayments,
    getPendingPayments,
    verifyPayment,
    rejectPayment,
    getPaymentStats
};
