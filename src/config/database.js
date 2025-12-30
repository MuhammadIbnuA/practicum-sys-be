/**
 * Database Configuration
 * Manage multiple database connections
 */

const databases = {
    SUPABASE: {
        name: 'Supabase (Pooler)',
        url: process.env.DATABASE_URL_SUPABASE,
        type: 'postgresql',
        provider: 'Supabase',
        status: 'Active (IPv4 compatible)'
    },
    AIVEN: {
        name: 'Aiven',
        url: process.env.DATABASE_URL_AIVEN,
        type: 'postgresql',
        provider: 'Aiven',
        status: 'Backup'
    }
};

const activeDatabase = process.env.ACTIVE_DATABASE || 'SUPABASE';

export const getDatabaseConfig = () => {
    return {
        active: activeDatabase,
        current: databases[activeDatabase],
        all: databases,
        url: process.env.DATABASE_URL
    };
};

export const listDatabases = () => {
    return Object.entries(databases).map(([key, config]) => ({
        id: key,
        name: config.name,
        provider: config.provider,
        status: key === activeDatabase ? 'Active' : 'Inactive'
    }));
};

export const getDatabase = (dbName) => {
    return databases[dbName] || null;
};

export default databases;
