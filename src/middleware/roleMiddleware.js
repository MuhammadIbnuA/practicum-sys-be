/**
 * Role-based Authorization Middleware
 * Verifies admin status and assistant context for teaching routes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify Admin middleware
 * Checks if the authenticated user has admin privileges
 */
export const verifyAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required.'
        });
    }

    if (!req.user.is_admin) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Admin privileges required.'
        });
    }

    next();
};

/**
 * Verify Assistant Context middleware
 * Checks if the user is assigned as an assistant for the specified class
 * Uses classId from route params, body, or query
 */
export const verifyAssistantContext = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        // Get classId from various sources
        const classId = parseInt(
            req.params.classId ||
            req.body.classId ||
            req.query.classId
        );

        // If classId is provided, verify assistant assignment
        if (classId) {
            const assignment = await prisma.classAssistant.findUnique({
                where: {
                    class_id_user_id: {
                        class_id: classId,
                        user_id: req.user.id
                    }
                }
            });

            if (!assignment) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You are not assigned as an assistant for this class.'
                });
            }

            // Attach classId to request for convenience
            req.classId = classId;
        }

        next();
    } catch (error) {
        console.error('Assistant context verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

/**
 * Verify Assistant Context for Session
 * Validates that the user is an assistant for the class that owns the session
 */
export const verifyAssistantForSession = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        const sessionId = parseInt(req.params.sessionId);

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: 'Session ID is required.'
            });
        }

        // Get session with its class
        const session = await prisma.classSession.findUnique({
            where: { id: sessionId },
            include: { class: true }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: 'Session not found.'
            });
        }

        // Check if user is assistant for this class
        const assignment = await prisma.classAssistant.findUnique({
            where: {
                class_id_user_id: {
                    class_id: session.class_id,
                    user_id: req.user.id
                }
            }
        });

        if (!assignment) {
            return res.status(403).json({
                success: false,
                message: 'Access denied. You are not assigned as an assistant for this class.'
            });
        }

        // Attach session and classId to request
        req.session = session;
        req.classId = session.class_id;
        next();
    } catch (error) {
        console.error('Assistant session verification error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error.'
        });
    }
};

export default { verifyAdmin, verifyAssistantContext, verifyAssistantForSession };
