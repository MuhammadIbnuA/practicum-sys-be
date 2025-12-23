/**
 * Authentication Controller
 * Standard auth system with access + refresh tokens
 */

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { apiResponse } from '../utils/helpers.js';
import prisma from '../lib/prisma.js';

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';  // Short-lived access token
const REFRESH_TOKEN_EXPIRY = '7d';  // Long-lived refresh token

/**
 * Generate access token (short-lived)
 */
const generateAccessToken = (userId) => {
    return jwt.sign(
        { userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: ACCESS_TOKEN_EXPIRY }
    );
};

/**
 * Generate refresh token (long-lived)
 */
const generateRefreshToken = (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
        { expiresIn: REFRESH_TOKEN_EXPIRY }
    );
};

/**
 * Validate password strength
 */
const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
        errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    return errors;
};

/**
 * Validate email format
 */
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

/**
 * Register a new user
 * POST /api/auth/register
 */
export const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Validation
        if (!email || !password || !name) {
            return apiResponse.error(res, 'Email, password, and name are required.', 400);
        }

        // Email validation
        if (!validateEmail(email)) {
            return apiResponse.error(res, 'Invalid email format.', 400);
        }

        // Password validation (for production)
        // const passwordErrors = validatePassword(password);
        // if (passwordErrors.length > 0) {
        //     return apiResponse.error(res, passwordErrors.join('. '), 400);
        // }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (existingUser) {
            return apiResponse.error(res, 'Email already registered.', 409);
        }

        // Hash password
        const saltRounds = 12; // Increased from 10 for better security
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await prisma.user.create({
            data: {
                email: email.toLowerCase().trim(),
                password: hashedPassword,
                name: name.trim(),
                is_admin: false
            },
            select: {
                id: true,
                email: true,
                name: true,
                is_admin: true,
                created_at: true
            }
        });

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        return apiResponse.success(res, {
            user,
            accessToken,
            refreshToken,
            expiresIn: 900 // 15 minutes in seconds
        }, 'Registration successful.', 201);
    } catch (error) {
        console.error('Registration error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Login user
 * POST /api/auth/login
 */
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return apiResponse.error(res, 'Email and password are required.', 400);
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() }
        });

        if (!user) {
            // Use generic message to prevent email enumeration
            return apiResponse.error(res, 'Invalid email or password.', 401);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return apiResponse.error(res, 'Invalid email or password.', 401);
        }

        // Generate tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Return user info (without password)
        const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            is_admin: user.is_admin,
            created_at: user.created_at
        };

        return apiResponse.success(res, {
            user: userResponse,
            accessToken,
            refreshToken,
            expiresIn: 900 // 15 minutes in seconds
        }, 'Login successful.');
    } catch (error) {
        console.error('Login error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Refresh access token
 * POST /api/auth/refresh
 */
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken: token } = req.body;

        if (!token) {
            return apiResponse.error(res, 'Refresh token is required.', 400);
        }

        // Verify refresh token
        let decoded;
        try {
            decoded = jwt.verify(
                token,
                process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
            );
        } catch (err) {
            if (err.name === 'TokenExpiredError') {
                return apiResponse.error(res, 'Refresh token expired. Please login again.', 401);
            }
            return apiResponse.error(res, 'Invalid refresh token.', 401);
        }

        // Verify token type
        if (decoded.type !== 'refresh') {
            return apiResponse.error(res, 'Invalid token type.', 401);
        }

        // Get user
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: {
                id: true,
                email: true,
                name: true,
                is_admin: true
            }
        });

        if (!user) {
            return apiResponse.error(res, 'User not found.', 401);
        }

        // Generate new tokens (token rotation for security)
        const newAccessToken = generateAccessToken(user.id);
        const newRefreshToken = generateRefreshToken(user.id);

        return apiResponse.success(res, {
            user,
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 900
        }, 'Token refreshed.');
    } catch (error) {
        console.error('Refresh token error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Get current user profile
 * GET /api/auth/me
 */
export const getProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: {
                id: true,
                email: true,
                name: true,
                is_admin: true,
                created_at: true,
                _count: {
                    select: {
                        enrollments: true,
                        classAssistants: true
                    }
                }
            }
        });

        return apiResponse.success(res, user, 'Profile retrieved.');
    } catch (error) {
        console.error('Get profile error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Change password
 * POST /api/auth/change-password
 */
export const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id;

        if (!currentPassword || !newPassword) {
            return apiResponse.error(res, 'Current and new password are required.', 400);
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        // Verify current password
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return apiResponse.error(res, 'Current password is incorrect.', 401);
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        return apiResponse.success(res, null, 'Password changed successfully.');
    } catch (error) {
        console.error('Change password error:', error);
        return apiResponse.error(res, 'Internal server error.', 500);
    }
};

/**
 * Logout (optional - for token blacklisting if needed)
 * POST /api/auth/logout
 */
export const logout = async (req, res) => {
    // With JWT, logout is mainly handled client-side
    // This endpoint can be used for:
    // 1. Token blacklisting (if implemented)
    // 2. Audit logging
    // 3. Clearing HTTP-only cookies (if used)

    return apiResponse.success(res, null, 'Logged out successfully.');
};

export default {
    register,
    login,
    refreshToken,
    getProfile,
    changePassword,
    logout
};
