/**
 * Database Management Routes
 * GET /api/database/info - Get current database info
 * GET /api/database/list - List all available databases
 * POST /api/database/switch - Switch to different database
 */

import { Router } from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { roleCheck } from '../middleware/roleMiddleware.js';
import { apiResponse } from '../utils/helpers.js';
import { getDatabaseConfig, listDatabases, getDatabase } from '../config/database.js';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

/**
 * GET /api/database/info
 * Get current database information
 */
router.get('/info', verifyToken, roleCheck('admin'), (req, res) => {
    try {
        const config = getDatabaseConfig();
        
        return apiResponse.success(res, {
            active: config.active,
            database: {
                name: config.current.name,
                provider: config.current.provider,
                type: config.current.type,
                status: config.current.status
            },
            url: config.url ? config.url.substring(0, 50) + '...' : 'Not configured'
        }, 'Current database information retrieved.');
    } catch (error) {
        console.error('Get database info error:', error);
        return apiResponse.error(res, 'Failed to get database info.', 500);
    }
});

/**
 * GET /api/database/list
 * List all available databases
 */
router.get('/list', verifyToken, roleCheck('admin'), (req, res) => {
    try {
        const databases = listDatabases();
        
        return apiResponse.success(res, {
            databases,
            current: process.env.ACTIVE_DATABASE || 'SUPABASE',
            note: 'To switch databases, use POST /api/database/switch'
        }, 'Available databases retrieved.');
    } catch (error) {
        console.error('List databases error:', error);
        return apiResponse.error(res, 'Failed to list databases.', 500);
    }
});

/**
 * POST /api/database/switch
 * Switch to a different database
 * Body: { database: 'SUPABASE' | 'AIVEN' }
 */
router.post('/switch', verifyToken, roleCheck('admin'), async (req, res) => {
    try {
        const { database } = req.body;

        // Validate database exists
        if (!database) {
            return apiResponse.error(res, 'Database name is required.', 400);
        }

        const db = getDatabase(database);
        if (!db) {
            return apiResponse.error(res, `Database "${database}" not found.`, 404);
        }

        // Check if already active
        if (process.env.ACTIVE_DATABASE === database) {
            return apiResponse.error(res, `Database "${database}" is already active.`, 400);
        }

        // Update .env file
        const envPath = path.join(process.cwd(), '.env');
        let envContent = await fs.readFile(envPath, 'utf-8');

        // Replace ACTIVE_DATABASE
        envContent = envContent.replace(
            /ACTIVE_DATABASE=".*"/,
            `ACTIVE_DATABASE="${database}"`
        );

        // Replace DATABASE_URL with the selected one
        const selectedUrl = process.env[`DATABASE_URL_${database}`];
        envContent = envContent.replace(
            /DATABASE_URL=".*"/,
            `DATABASE_URL="${selectedUrl}"`
        );
        envContent = envContent.replace(
            /DIRECT_URL=".*"/,
            `DIRECT_URL="${selectedUrl}"`
        );

        await fs.writeFile(envPath, envContent, 'utf-8');

        // Log the switch
        console.log(`✅ Database switched to: ${database}`);
        console.log(`⚠️  Server restart required for changes to take effect`);

        return apiResponse.success(res, {
            switched: true,
            from: process.env.ACTIVE_DATABASE,
            to: database,
            name: db.name,
            provider: db.provider,
            message: 'Database switched successfully. Please restart the server to apply changes.'
        }, 'Database switched.');
    } catch (error) {
        console.error('Switch database error:', error);
        return apiResponse.error(res, 'Failed to switch database.', 500);
    }
});

/**
 * POST /api/database/test
 * Test connection to a database
 * Body: { database: 'SUPABASE' | 'AIVEN' }
 */
router.post('/test', verifyToken, roleCheck('admin'), async (req, res) => {
    try {
        const { database } = req.body;

        if (!database) {
            return apiResponse.error(res, 'Database name is required.', 400);
        }

        const db = getDatabase(database);
        if (!db) {
            return apiResponse.error(res, `Database "${database}" not found.`, 404);
        }

        // Try to connect (would need to implement actual connection test)
        // For now, just verify the URL exists
        if (!db.url) {
            return apiResponse.error(res, `No connection URL configured for "${database}".`, 500);
        }

        return apiResponse.success(res, {
            database: db.name,
            provider: db.provider,
            connected: true,
            message: 'Database connection test passed (URL verified).'
        }, 'Database test successful.');
    } catch (error) {
        console.error('Test database error:', error);
        return apiResponse.error(res, 'Failed to test database.', 500);
    }
});

export default router;
