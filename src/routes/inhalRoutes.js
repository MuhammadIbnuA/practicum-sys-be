import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { verifyAdmin } from '../middleware/roleMiddleware.js';
import {
    submitInhalPayment,
    getMyInhalPayments,
    getInhalPaymentStatus,
    getAllInhalPayments,
    verifyInhalPayment,
    rejectInhalPayment,
    getInhalStats
} from '../controllers/inhalController.js';

const router = express.Router();

// Student routes
router.post('/student/submit', verifyToken, submitInhalPayment);
router.get('/student/my-payments', verifyToken, getMyInhalPayments);
router.get('/student/status/:sessionId', verifyToken, getInhalPaymentStatus);

// Admin routes
router.get('/admin/payments', verifyToken, verifyAdmin, getAllInhalPayments);
router.put('/admin/payments/:paymentId/verify', verifyToken, verifyAdmin, verifyInhalPayment);
router.put('/admin/payments/:paymentId/reject', verifyToken, verifyAdmin, rejectInhalPayment);
router.get('/admin/stats', verifyToken, verifyAdmin, getInhalStats);

export default router;
