/**
 * Practicum Attendance Management System
 * Main Server Entry Point
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import studentRoutes from './src/routes/studentRoutes.js';
import teachingRoutes from './src/routes/teachingRoutes.js';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Enable CORS
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Practicum Attendance API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/teaching', teachingRoutes);

// =============================================================================
// ERROR HANDLING
// =============================================================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: 'Validation error',
            errors: err.errors
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    // Default error response
    res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message
    });
});

// =============================================================================
// SERVER START
// =============================================================================

app.listen(PORT, () => {
    console.log('='.repeat(50));
    console.log('  Practicum Attendance Management System API');
    console.log('='.repeat(50));
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  Server:      http://localhost:${PORT}`);
    console.log(`  Health:      http://localhost:${PORT}/api/health`);
    console.log('='.repeat(50));
    console.log('  API Endpoints:');
    console.log('    POST /api/auth/register     - Register user');
    console.log('    POST /api/auth/login        - Login');
    console.log('    GET  /api/auth/me           - Get profile');
    console.log('  Admin (requires admin token):');
    console.log('    GET  /api/admin/semesters   - List semesters');
    console.log('    POST /api/admin/semesters   - Create semester');
    console.log('    PUT  /api/admin/semesters/:id/activate');
    console.log('    GET  /api/admin/courses     - List courses');
    console.log('    POST /api/admin/courses     - Create course');
    console.log('    POST /api/admin/classes     - Create class (11 sessions)');
    console.log('    PUT  /api/admin/classes/:id - Update class');
    console.log('    POST /api/admin/classes/:id/assistants');
    console.log('    DELETE /api/admin/classes/:id/assistants/:userId');
    console.log('    GET  /api/admin/permissions - List permissions');
    console.log('    PUT  /api/admin/permissions/:id/approve');
    console.log('    PUT  /api/admin/permissions/:id/reject');
    console.log('    GET  /api/admin/assistants/log');
    console.log('    POST /api/admin/assistants/validate');
    console.log('  Student (requires auth token):');
    console.log('    GET  /api/student/classes/open');
    console.log('    POST /api/student/enroll');
    console.log('    GET  /api/student/my-classes');
    console.log('    GET  /api/student/my-classes/:id/report');
    console.log('    POST /api/student/permissions  (multipart)');
    console.log('    GET  /api/student/permissions');
    console.log('  Teaching (requires assistant token):');
    console.log('    GET  /api/teaching/schedule');
    console.log('    POST /api/teaching/check-in');
    console.log('    GET  /api/teaching/classes/:id/sessions');
    console.log('    GET  /api/teaching/sessions/:id/roster');
    console.log('    PUT  /api/teaching/sessions/:id/update-batch');
    console.log('='.repeat(50));
});

export default app;
