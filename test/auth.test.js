/**
 * Authentication API Tests
 * Tests for /api/auth/* endpoints
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, defaultHeaders, authHeaders, generateEmail, generatePassword, parseJSON } from './config.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        checks: ['rate>0.9'],
    },
};

// Store test data between tests
let testUser = {
    email: generateEmail(),
    password: generatePassword(),
    name: 'Test User',
    token: null,
};

export default function () {
    group('Authentication API Tests', function () {

        // =========================================================================
        // TEST 1: Register new user
        // =========================================================================
        group('POST /api/auth/register', function () {
            const payload = JSON.stringify({
                email: testUser.email,
                password: testUser.password,
                name: testUser.name,
            });

            const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
                headers: defaultHeaders,
            });

            const success = check(res, {
                'Register: status is 201': (r) => r.status === 201,
                'Register: response has success true': (r) => parseJSON(r)?.success === true,
                'Register: response has token': (r) => parseJSON(r)?.data?.token !== undefined,
                'Register: response has user': (r) => parseJSON(r)?.data?.user !== undefined,
            });

            if (success) {
                const data = parseJSON(res);
                testUser.token = data.data.token;
                console.log('✓ Register successful, token obtained');
            }

            // Example Request/Response
            console.log('\n--- POST /api/auth/register ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.5);

        // =========================================================================
        // TEST 2: Register duplicate email (should fail)
        // =========================================================================
        group('POST /api/auth/register - Duplicate Email', function () {
            const payload = JSON.stringify({
                email: testUser.email,
                password: testUser.password,
                name: 'Another User',
            });

            const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
                headers: defaultHeaders,
            });

            check(res, {
                'Register Duplicate: status is 409': (r) => r.status === 409,
                'Register Duplicate: success is false': (r) => parseJSON(r)?.success === false,
            });

            console.log('\n--- POST /api/auth/register (Duplicate) ---');
            console.log('Response:', res.body);
        });

        sleep(0.5);

        // =========================================================================
        // TEST 3: Login with valid credentials
        // =========================================================================
        group('POST /api/auth/login', function () {
            const payload = JSON.stringify({
                email: testUser.email,
                password: testUser.password,
            });

            const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
                headers: defaultHeaders,
            });

            const success = check(res, {
                'Login: status is 200': (r) => r.status === 200,
                'Login: response has success true': (r) => parseJSON(r)?.success === true,
                'Login: response has token': (r) => parseJSON(r)?.data?.token !== undefined,
                'Login: response has user info': (r) => parseJSON(r)?.data?.user?.email === testUser.email,
            });

            if (success) {
                const data = parseJSON(res);
                testUser.token = data.data.token;
                console.log('✓ Login successful');
            }

            console.log('\n--- POST /api/auth/login ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.5);

        // =========================================================================
        // TEST 4: Login with invalid credentials
        // =========================================================================
        group('POST /api/auth/login - Invalid Credentials', function () {
            const payload = JSON.stringify({
                email: testUser.email,
                password: 'wrongpassword',
            });

            const res = http.post(`${BASE_URL}/api/auth/login`, payload, {
                headers: defaultHeaders,
            });

            check(res, {
                'Login Invalid: status is 401': (r) => r.status === 401,
                'Login Invalid: success is false': (r) => parseJSON(r)?.success === false,
            });

            console.log('\n--- POST /api/auth/login (Invalid) ---');
            console.log('Response:', res.body);
        });

        sleep(0.5);

        // =========================================================================
        // TEST 5: Get profile with valid token
        // =========================================================================
        group('GET /api/auth/me', function () {
            const res = http.get(`${BASE_URL}/api/auth/me`, {
                headers: authHeaders(testUser.token),
            });

            check(res, {
                'Get Profile: status is 200': (r) => r.status === 200,
                'Get Profile: has user email': (r) => parseJSON(r)?.data?.email === testUser.email,
                'Get Profile: has user name': (r) => parseJSON(r)?.data?.name === testUser.name,
            });

            console.log('\n--- GET /api/auth/me ---');
            console.log('Response:', res.body);
        });

        sleep(0.5);

        // =========================================================================
        // TEST 6: Get profile without token
        // =========================================================================
        group('GET /api/auth/me - No Token', function () {
            const res = http.get(`${BASE_URL}/api/auth/me`, {
                headers: defaultHeaders,
            });

            check(res, {
                'Get Profile No Token: status is 401': (r) => r.status === 401,
            });

            console.log('\n--- GET /api/auth/me (No Token) ---');
            console.log('Response:', res.body);
        });

    });
}

export function handleSummary(data) {
    return {
        'test/md/auth-test-report.md': generateMarkdownReport(data, 'Authentication API'),
    };
}

function generateMarkdownReport(data, testName) {
    const metrics = data.metrics;
    const checks = data.root_group?.checks || [];

    let report = `# ${testName} Test Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Requests | ${metrics.http_reqs?.values?.count || 0} |\n`;
    report += `| Failed Requests | ${metrics.http_req_failed?.values?.passes || 0} |\n`;
    report += `| Avg Response Time | ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms |\n`;
    report += `| P95 Response Time | ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms |\n\n`;

    report += `## Checks\n\n`;
    report += `| Check | Passes | Fails |\n`;
    report += `|-------|--------|-------|\n`;

    return report;
}
