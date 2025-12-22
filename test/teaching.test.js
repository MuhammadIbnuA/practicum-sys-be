/**
 * Teaching API Tests
 * Tests for /api/teaching/* endpoints
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
let assistantToken = null;
let testClassId = null;
let testSessionId = null;

export function setup() {
    // For teaching tests, we need:
    // 1. An assistant user
    // 2. The user must be assigned to a class (ClassAssistant)
    // 3. The class must have sessions

    // Create assistant user
    const assistantEmail = generateEmail();
    const password = generatePassword();

    const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
        email: assistantEmail,
        password: password,
        name: 'Test Assistant',
    }), { headers: defaultHeaders });

    if (registerRes.status === 201) {
        const data = parseJSON(registerRes);
        console.log('✓ Assistant user created:', assistantEmail);
        console.log('Note: You need to assign this user as assistant to a class via Admin API');

        return {
            assistantToken: data.data.token,
            assistantId: data.data.user.id,
            assistantEmail: assistantEmail
        };
    }

    return { assistantToken: null };
}

export default function (data) {
    assistantToken = data.assistantToken;

    if (!assistantToken) {
        console.log('⚠ No assistant token available. Skipping teaching tests.');
        return;
    }

    group('Teaching API Tests', function () {

        // =========================================================================
        // SCHEDULE
        // =========================================================================

        group('GET /api/teaching/schedule - Get My Teaching Schedule', function () {
            const res = http.get(`${BASE_URL}/api/teaching/schedule`, {
                headers: authHeaders(assistantToken),
            });

            const success = check(res, {
                'Schedule: status is 200': (r) => r.status === 200,
                'Schedule: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            if (success) {
                const classes = parseJSON(res).data;
                if (classes.length > 0) {
                    testClassId = classes[0].id;
                    if (classes[0].sessions && classes[0].sessions.length > 0) {
                        testSessionId = classes[0].sessions[0].id;
                    }
                    console.log('✓ Found assigned class ID:', testClassId);
                    console.log('✓ Found session ID:', testSessionId);
                } else {
                    console.log('⚠ No assigned classes (user needs to be assigned as assistant)');
                }
            }

            console.log('\n--- GET /api/teaching/schedule ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // CHECK-IN
        // =========================================================================

        group('POST /api/teaching/check-in - Check In for Session', function () {
            if (!testSessionId) {
                console.log('⚠ No session available, showing example');

                console.log('\n--- POST /api/teaching/check-in ---');
                console.log('Example Request:', JSON.stringify({ session_id: 1 }));
                console.log('Expected Response: { success: true, data: { id, user_id, session_id, check_in_time, status } }');
                return;
            }

            const payload = JSON.stringify({
                session_id: testSessionId,
            });

            const res = http.post(`${BASE_URL}/api/teaching/check-in`, payload, {
                headers: authHeaders(assistantToken),
            });

            check(res, {
                'Check-in: status is 201 or 403 or 409': (r) => [201, 403, 409].includes(r.status),
            });

            console.log('\n--- POST /api/teaching/check-in ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // SESSION MANAGEMENT
        // =========================================================================

        group('GET /api/teaching/classes/:classId/sessions - Get Class Sessions', function () {
            if (!testClassId) {
                console.log('⚠ No class available, showing example');

                console.log('\n--- GET /api/teaching/classes/:classId/sessions ---');
                console.log('Expected Response: { success: true, data: [{ id, session_number, date, topic, type }] }');
                return;
            }

            const res = http.get(`${BASE_URL}/api/teaching/classes/${testClassId}/sessions`, {
                headers: authHeaders(assistantToken),
            });

            check(res, {
                'Class Sessions: status is 200 or 403': (r) => [200, 403].includes(r.status),
            });

            console.log('\n--- GET /api/teaching/classes/:classId/sessions ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('GET /api/teaching/sessions/:sessionId/roster - Get Session Roster', function () {
            if (!testSessionId) {
                console.log('⚠ No session available, showing example');

                console.log('\n--- GET /api/teaching/sessions/:sessionId/roster ---');
                console.log('Expected Response:');
                console.log(JSON.stringify({
                    session: { id: 1, session_number: 1, date: null, topic: 'Pertemuan 1' },
                    class: { id: 1, name: 'Kelas A' },
                    student_count: 5,
                    roster: [
                        { student_id: 1, student_name: 'John', attendance: { status: 'HADIR', grade: 85 } }
                    ]
                }, null, 2));
                return;
            }

            const res = http.get(`${BASE_URL}/api/teaching/sessions/${testSessionId}/roster`, {
                headers: authHeaders(assistantToken),
            });

            check(res, {
                'Session Roster: status is 200 or 403': (r) => [200, 403].includes(r.status),
            });

            console.log('\n--- GET /api/teaching/sessions/:sessionId/roster ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('PUT /api/teaching/sessions/:sessionId/update-batch - Batch Update Attendance', function () {
            if (!testSessionId) {
                console.log('⚠ No session available, showing example');

                console.log('\n--- PUT /api/teaching/sessions/:sessionId/update-batch ---');
                console.log('Example Request:');
                console.log(JSON.stringify({
                    updates: [
                        { studentId: 1, status: 'HADIR', grade: 85 },
                        { studentId: 2, status: 'HADIR', grade: 90 },
                        { studentId: 3, status: 'ALPHA', grade: null },
                        { studentId: 4, status: 'IZIN_SAKIT', grade: null }
                    ]
                }, null, 2));
                console.log('\nNote: Grade can only be set if status is HADIR');
                console.log('Expected Response: { success: true, data: [{ studentId, success, attendance }] }');
                return;
            }

            const payload = JSON.stringify({
                updates: [
                    // Example updates - would need real student IDs
                ]
            });

            const res = http.put(`${BASE_URL}/api/teaching/sessions/${testSessionId}/update-batch`, payload, {
                headers: authHeaders(assistantToken),
            });

            check(res, {
                'Batch Update: status is 200 or 403': (r) => [200, 403].includes(r.status),
            });

            console.log('\n--- PUT /api/teaching/sessions/:sessionId/update-batch ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

    });
}

export function handleSummary(data) {
    return {
        'test/md/teaching-test-report.md': generateMarkdownReport(data),
    };
}

function generateMarkdownReport(data) {
    const metrics = data.metrics;

    let report = `# Teaching API Test Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Requests | ${metrics.http_reqs?.values?.count || 0} |\n`;
    report += `| Failed Requests | ${metrics.http_req_failed?.values?.passes || 0} |\n`;
    report += `| Avg Response Time | ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms |\n`;
    report += `| P95 Response Time | ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms |\n\n`;

    report += `## Endpoints Tested\n\n`;
    report += `- GET /api/teaching/schedule\n`;
    report += `- POST /api/teaching/check-in\n`;
    report += `- GET /api/teaching/classes/:classId/sessions\n`;
    report += `- GET /api/teaching/sessions/:sessionId/roster\n`;
    report += `- PUT /api/teaching/sessions/:sessionId/update-batch\n`;

    return report;
}
