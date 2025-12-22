/**
 * Authentication Controller
 * Handles user registration and login
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { apiResponse } from '../utils/helpers.js';

const prisma = new PrismaClient();

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

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return apiResponse.error(res, 'Email already registered.', 409);
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
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

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        return apiResponse.success(res, { user, token }, 'Registration successful.', 201);
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
            where: { email }
        });

        if (!user) {
            return apiResponse.error(res, 'Invalid email or password.', 401);
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return apiResponse.error(res, 'Invalid email or password.', 401);
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        // Return user info (without password)
        const userResponse = {
            id: user.id,
            email: user.email,
            name: user.name,
            is_admin: user.is_admin,
            created_at: user.created_at
        };

        return apiResponse.success(res, { user: userResponse, token }, 'Login successful.');
    } catch (error) {
        console.error('Login error:', error);
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

export default { register, login, getProfile };
