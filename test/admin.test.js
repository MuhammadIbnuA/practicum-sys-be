/**
 * Admin API Tests
 * Tests for /api/admin/* endpoints
 * Note: Requires an admin user in the database
 */

import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { BASE_URL, defaultHeaders, authHeaders, generateEmail, generatePassword, parseJSON } from './config.js';

export const options = {
    vus: 1,
    iterations: 1,
    thresholds: {
        http_req_duration: ['p(95)<2000'],
        checks: ['rate>0.8'],
    },
};

// Test state
let adminToken = null;
let testSemesterId = null;
let testCourseId = null;
let testClassId = null;
let assistantUserId = null;

export function setup() {
    // First, register an admin user (you may need to manually set is_admin=true in DB)
    // Or use existing admin credentials

    // For this test, we'll create a user and assume you'll set is_admin=true manually
    const adminEmail = `admin_${Date.now()}@test.com`;
    const adminPassword = 'AdminPass123!';

    // Register admin user
    const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        name: 'Test Admin',
    }), { headers: defaultHeaders });

    if (registerRes.status === 201) {
        console.log('Admin user created. Please set is_admin=true in database for:', adminEmail);
        const data = parseJSON(registerRes);
        return {
            adminToken: data.data.token,
            adminEmail,
            note: 'Set is_admin=true in DB for this user to run admin tests'
        };
    }

    // Try to login with existing admin (if you have one)
    const loginRes = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify({
        email: 'admin@test.com', // Change to your admin email
        password: 'admin123',    // Change to your admin password
    }), { headers: defaultHeaders });

    if (loginRes.status === 200) {
        const data = parseJSON(loginRes);
        return { adminToken: data.data.token };
    }

    return { adminToken: null };
}

export default function (data) {
    adminToken = data.adminToken;

    if (!adminToken) {
        console.log('⚠ No admin token available. Skipping admin tests.');
        console.log('Please create an admin user and update setup() credentials.');
        return;
    }

    group('Admin API Tests', function () {

        // =========================================================================
        // SEMESTER MANAGEMENT
        // =========================================================================

        group('POST /api/admin/semesters - Create Semester', function () {
            const payload = JSON.stringify({
                name: `Semester Test ${Date.now()}`,
            });

            const res = http.post(`${BASE_URL}/api/admin/semesters`, payload, {
                headers: authHeaders(adminToken),
            });

            const success = check(res, {
                'Create Semester: status is 201': (r) => r.status === 201,
                'Create Semester: has id': (r) => parseJSON(r)?.data?.id !== undefined,
            });

            if (success) {
                testSemesterId = parseJSON(res).data.id;
                console.log('✓ Semester created with ID:', testSemesterId);
            }

            console.log('\n--- POST /api/admin/semesters ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('GET /api/admin/semesters - List Semesters', function () {
            const res = http.get(`${BASE_URL}/api/admin/semesters`, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'List Semesters: status is 200': (r) => r.status === 200,
                'List Semesters: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/admin/semesters ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('PUT /api/admin/semesters/:id/activate - Activate Semester', function () {
            if (!testSemesterId) {
                console.log('⚠ No semester ID, skipping');
                return;
            }

            const res = http.put(`${BASE_URL}/api/admin/semesters/${testSemesterId}/activate`, null, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'Activate Semester: status is 200': (r) => r.status === 200,
                'Activate Semester: is_active is true': (r) => parseJSON(r)?.data?.is_active === true,
            });

            console.log('\n--- PUT /api/admin/semesters/:id/activate ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // COURSE MANAGEMENT
        // =========================================================================

        group('POST /api/admin/courses - Create Course', function () {
            const payload = JSON.stringify({
                code: `CS${Date.now().toString().slice(-6)}`,
                name: 'Test Programming Course',
            });

            const res = http.post(`${BASE_URL}/api/admin/courses`, payload, {
                headers: authHeaders(adminToken),
            });

            const success = check(res, {
                'Create Course: status is 201': (r) => r.status === 201,
                'Create Course: has id': (r) => parseJSON(r)?.data?.id !== undefined,
            });

            if (success) {
                testCourseId = parseJSON(res).data.id;
                console.log('✓ Course created with ID:', testCourseId);
            }

            console.log('\n--- POST /api/admin/courses ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('GET /api/admin/courses - List Courses', function () {
            const res = http.get(`${BASE_URL}/api/admin/courses`, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'List Courses: status is 200': (r) => r.status === 200,
                'List Courses: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/admin/courses ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // CLASS MANAGEMENT
        // =========================================================================

        group('POST /api/admin/classes - Create Class (with 11 sessions)', function () {
            if (!testCourseId || !testSemesterId) {
                console.log('⚠ Missing course or semester ID, skipping');
                return;
            }

            const payload = JSON.stringify({
                course_id: testCourseId,
                semester_id: testSemesterId,
                name: 'Kelas A',
                quota: 30,
                day: 'Monday',
                time: '08:00-10:00',
                room: 'Lab 101',
            });

            const res = http.post(`${BASE_URL}/api/admin/classes`, payload, {
                headers: authHeaders(adminToken),
            });

            const success = check(res, {
                'Create Class: status is 201': (r) => r.status === 201,
                'Create Class: has id': (r) => parseJSON(r)?.data?.id !== undefined,
                'Create Class: has 11 sessions': (r) => parseJSON(r)?.data?.sessions?.length === 11,
            });

            if (success) {
                testClassId = parseJSON(res).data.id;
                console.log('✓ Class created with ID:', testClassId);
                console.log('✓ 11 sessions auto-generated');
            }

            console.log('\n--- POST /api/admin/classes ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('GET /api/admin/semesters/:semesterId/classes - List Classes by Semester', function () {
            if (!testSemesterId) {
                console.log('⚠ No semester ID, skipping');
                return;
            }

            const res = http.get(`${BASE_URL}/api/admin/semesters/${testSemesterId}/classes`, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'List Classes: status is 200': (r) => r.status === 200,
                'List Classes: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/admin/semesters/:semesterId/classes ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('PUT /api/admin/classes/:classId - Update Class', function () {
            if (!testClassId) {
                console.log('⚠ No class ID, skipping');
                return;
            }

            const payload = JSON.stringify({
                quota: 35,
                room: 'Lab 102',
            });

            const res = http.put(`${BASE_URL}/api/admin/classes/${testClassId}`, payload, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'Update Class: status is 200': (r) => r.status === 200,
                'Update Class: quota updated': (r) => parseJSON(r)?.data?.quota === 35,
            });

            console.log('\n--- PUT /api/admin/classes/:classId ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // ASSISTANT ASSIGNMENT
        // =========================================================================

        // Create a user to be an assistant
        group('Setup: Create Assistant User', function () {
            const payload = JSON.stringify({
                email: generateEmail(),
                password: generatePassword(),
                name: 'Test Assistant',
            });

            const res = http.post(`${BASE_URL}/api/auth/register`, payload, {
                headers: defaultHeaders,
            });

            if (res.status === 201) {
                assistantUserId = parseJSON(res).data.user.id;
                console.log('✓ Assistant user created with ID:', assistantUserId);
            }
        });

        sleep(0.3);

        group('POST /api/admin/classes/:classId/assistants - Assign Assistant', function () {
            if (!testClassId || !assistantUserId) {
                console.log('⚠ Missing class or user ID, skipping');
                return;
            }

            const payload = JSON.stringify({
                user_id: assistantUserId,
            });

            const res = http.post(`${BASE_URL}/api/admin/classes/${testClassId}/assistants`, payload, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'Assign Assistant: status is 201': (r) => r.status === 201,
            });

            console.log('\n--- POST /api/admin/classes/:classId/assistants ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('DELETE /api/admin/classes/:classId/assistants/:userId - Remove Assistant', function () {
            if (!testClassId || !assistantUserId) {
                console.log('⚠ Missing class or user ID, skipping');
                return;
            }

            const res = http.del(`${BASE_URL}/api/admin/classes/${testClassId}/assistants/${assistantUserId}`, null, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'Remove Assistant: status is 200': (r) => r.status === 200,
            });

            console.log('\n--- DELETE /api/admin/classes/:classId/assistants/:userId ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // PERMISSION MANAGEMENT
        // =========================================================================

        group('GET /api/admin/permissions - List Permissions', function () {
            const res = http.get(`${BASE_URL}/api/admin/permissions`, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'List Permissions: status is 200': (r) => r.status === 200,
                'List Permissions: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/admin/permissions ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // ASSISTANT MONITORING
        // =========================================================================

        group('GET /api/admin/assistants/log - Get Assistant Logs', function () {
            const res = http.get(`${BASE_URL}/api/admin/assistants/log`, {
                headers: authHeaders(adminToken),
            });

            check(res, {
                'Get Logs: status is 200': (r) => r.status === 200,
                'Get Logs: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/admin/assistants/log ---');
            console.log('Response:', res.body);
        });

    });
}

export function handleSummary(data) {
    return {
        'test/md/admin-test-report.md': generateMarkdownReport(data),
    };
}

function generateMarkdownReport(data) {
    const metrics = data.metrics;

    let report = `# Admin API Test Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Requests | ${metrics.http_reqs?.values?.count || 0} |\n`;
    report += `| Failed Requests | ${metrics.http_req_failed?.values?.passes || 0} |\n`;
    report += `| Avg Response Time | ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms |\n`;
    report += `| P95 Response Time | ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms |\n\n`;

    report += `## Endpoints Tested\n\n`;
    report += `- POST /api/admin/semesters\n`;
    report += `- GET /api/admin/semesters\n`;
    report += `- PUT /api/admin/semesters/:id/activate\n`;
    report += `- POST /api/admin/courses\n`;
    report += `- GET /api/admin/courses\n`;
    report += `- POST /api/admin/classes\n`;
    report += `- GET /api/admin/semesters/:semesterId/classes\n`;
    report += `- PUT /api/admin/classes/:classId\n`;
    report += `- POST /api/admin/classes/:classId/assistants\n`;
    report += `- DELETE /api/admin/classes/:classId/assistants/:userId\n`;
    report += `- GET /api/admin/permissions\n`;
    report += `- GET /api/admin/assistants/log\n`;

    return report;
}
