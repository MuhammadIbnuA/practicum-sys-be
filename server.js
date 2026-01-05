/**
 * Practicum Attendance Management System
 * Main Server Entry Point - Vercel Serverless Compatible
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import compression from 'compression';

// Import routes
import authRoutes from './src/routes/authRoutes.js';
import adminRoutes from './src/routes/adminRoutes.js';
import studentRoutes from './src/routes/studentRoutes.js';
import teachingRoutes from './src/routes/teachingRoutes.js';
import paymentRoutes from './src/routes/paymentRoutes.js';
import faceRoutes from './src/routes/faceRoutes.js';
import databaseRoutes from './src/routes/databaseRoutes.js';

// Import services
import { initializeBuckets } from './src/services/minioService.js';

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// =============================================================================
// MIDDLEWARE
// =============================================================================

// Enable CORS for all origins
app.use(cors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Enable gzip compression for all responses
app.use(compression({
    level: 6, // Balance between compression ratio and CPU
    threshold: 512 // Only compress responses > 512 bytes
}));

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response time tracking
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (duration > 1000) {
            console.log(`[SLOW] ${req.method} ${req.path} - ${duration}ms`);
        }
    });
    next();
});

// Simple in-memory cache for read-only endpoints (5 minute TTL)
const responseCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache middleware - only cache GET requests
app.use((req, res, next) => {
    // Cache only specific GET endpoints (avoid caching paginated endpoints with params)
    const cacheable = req.method === 'GET' && (
        req.path === '/api/admin/time-slots' ||
        req.path === '/api/admin/rooms' ||
        req.path === '/api/admin/semesters' && !req.query.page ||
        req.path === '/api/admin/courses' && !req.query.page
    );

    if (cacheable) {
        const cached = responseCache.get(req.path);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            console.log(`[CACHE] ${req.path} (hit)`);
            return res.json(cached.data);
        }
    }

    // Capture original res.json
    const originalJson = res.json.bind(res);
    res.json = function(data) {
        if (cacheable && res.statusCode === 200) {
            responseCache.set(req.path, { data, timestamp: Date.now() });
            console.log(`[CACHE] ${req.path} (stored)`);
        }
        return originalJson(data);
    };

    next();
});

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
app.use('/api/payment', paymentRoutes);
app.use('/api', faceRoutes); // Face routes (includes /student/face, /teaching/face, /admin/face)
app.use('/api/database', databaseRoutes);

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
    app.listen(PORT, async () => {
        console.log('='.repeat(50));
        console.log('  Practicum Attendance Management System API');
        console.log('='.repeat(50));
        console.log(`  Server:      http://localhost:${PORT}`);
        console.log(`  Health:      http://localhost:${PORT}/api/health`);
        console.log('='.repeat(50));
        
        // Initialize MinIO buckets
        await initializeBuckets();
    });
}

// Export for Vercel serverless
export default app;
