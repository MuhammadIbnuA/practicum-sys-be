/**
 * Payment Routes
 * /api/payment/* - Student payment endpoints
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    submitPayment,
    getPaymentStatus,
    getMyPayments
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

export default router;
