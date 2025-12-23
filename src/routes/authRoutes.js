/**
 * Authentication Routes
 * /api/auth/*
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
    register,
    login,
    refreshToken,
    getProfile,
    changePassword,
    logout
} from '../controllers/authController.js';

const router = Router();

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshToken);
router.post('/logout', logout);

// Protected routes
router.get('/me', verifyToken, getProfile);
router.post('/change-password', verifyToken, changePassword);

export default router;
