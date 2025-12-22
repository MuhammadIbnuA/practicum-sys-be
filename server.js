/**
 * Practicum Attendance Management System
 * Main Server Entry Point - Vercel Serverless Compatible
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import studentRoutes from './src/routes/studentRoutes.js';
import teachingRoutes from './src/routes/teachingRoutes.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Enable CORS for all origins (update in production)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =============================================================================
// ROUTES
// =============================================================================

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Practicum Attendance API',
        version: '1.0.0',
        endpoints: ['/api/auth', '/api/admin', '/api/student', '/api/teaching']
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Practicum Attendance API is running',
        timestamp: new Date().toISOString()
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

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error'
    });
});

// =============================================================================
// SERVER START (only in non-serverless mode)
// =============================================================================

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log('='.repeat(50));
        console.log('  Practicum Attendance Management System API');
        console.log('='.repeat(50));
        console.log(`  Server:      http://localhost:${PORT}`);
        console.log(`  Health:      http://localhost:${PORT}/api/health`);
        console.log('='.repeat(50));
    });
}

// Export for Vercel serverless
export default app;
