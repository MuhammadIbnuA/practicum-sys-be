/**
 * K6 Configuration and Shared Utilities
 * Base configuration for all API tests
 */

// Base URL - change this if your server runs on different port
export const BASE_URL = 'http://localhost:3000';

// Default headers
export const defaultHeaders = {
    'Content-Type': 'application/json',
};

// Helper to create auth header
export function authHeaders(token) {
    return {
        ...defaultHeaders,
        'Authorization': `Bearer ${token}`,
    };
}

// Test data generators
export function generateEmail() {
    return `test_${Date.now()}_${Math.random().toString(36).substring(7)}@test.com`;
}

export function generatePassword() {
    return 'TestPass123!';
}

// Response validators
export function checkResponse(res, expectedStatus, checkName) {
    const success = res.status === expectedStatus;
    if (!success) {
        console.log(`${checkName} FAILED: Expected ${expectedStatus}, got ${res.status}`);
        console.log(`Response body: ${res.body}`);
    }
    return success;
}

// Parse JSON response safely
export function parseJSON(res) {
    try {
        return JSON.parse(res.body);
    } catch (e) {
        console.log('Failed to parse JSON:', res.body);
        return null;
    }
}

// Test thresholds configuration
export const defaultThresholds = {
    http_req_duration: ['p(95)<2000'], // 95% of requests should complete within 2s
    http_req_failed: ['rate<0.1'],     // Less than 10% failure rate
};

// Default test options
export const defaultOptions = {
    vus: 1,
    iterations: 1,
    thresholds: defaultThresholds,
};
