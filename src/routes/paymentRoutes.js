/**
 * Payment Routes
 * /api/payment/* - Student payment endpoints
 * /api/admin/payments/* - Admin payment verification endpoints
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../middleware/roleMiddleware.js';
import {
    submitPayment,
    getPaymentStatus,
    getMyPayments,
    getPendingPayments,
    verifyPayment,
    rejectPayment,
    getPaymentStats
} from '../controllers/paymentController.js';

const router = Router();

// =============================================================================
// STUDENT PAYMENT ENDPOINTS
// =============================================================================

/**
 * @route   POST /api/payment/submit
 * @desc    Submit payment proof for class enrollment
 * @access  Authenticated
 */
router.post('/submit', verifyToken, submitPayment);

/**
 * @route   GET /api/payment/status/:classId
 * @desc    Get payment status for a class
 * @access  Authenticated
 */
router.get('/status/:classId', verifyToken, getPaymentStatus);

/**
 * @route   GET /api/payment/my-payments
 * @desc    Get all payments for current student
 * @access  Authenticated
 */
router.get('/my-payments', verifyToken, getMyPayments);

// =============================================================================
// ADMIN PAYMENT VERIFICATION ENDPOINTS
// =============================================================================

/**
 * @route   GET /api/admin/payments
 * @desc    Get all payments (filter by status)
 * @access  Admin
 */
router.get('/admin/payments', verifyToken, verifyAdmin, getPendingPayments);

/**
 * @route   PUT /api/admin/payments/:paymentId/verify
 * @desc    Verify payment and create enrollment
 * @access  Admin
 */
router.put('/admin/payments/:paymentId/verify', verifyToken, verifyAdmin, verifyPayment);

/**
 * @route   PUT /api/admin/payments/:paymentId/reject
 * @desc    Reject payment
 * @access  Admin
 */
router.put('/admin/payments/:paymentId/reject', verifyToken, verifyAdmin, rejectPayment);

/**
 * @route   GET /api/admin/payments/stats
 * @desc    Get payment statistics
 * @access  Admin
 */
router.get('/admin/payments/stats', verifyToken, verifyAdmin, getPaymentStats);

export default router;
