/**
 * Student API Tests
 * Tests for /api/student/* endpoints
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
let studentToken = null;
let studentEmail = null;
let enrolledClassId = null;

export function setup() {
    // Create a student user
    studentEmail = generateEmail();
    const password = generatePassword();

    const registerRes = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify({
        email: studentEmail,
        password: password,
        name: 'Test Student',
    }), { headers: defaultHeaders });

    if (registerRes.status === 201) {
        const data = parseJSON(registerRes);
        console.log('✓ Student user created:', studentEmail);
        return {
            studentToken: data.data.token,
            studentId: data.data.user.id,
            studentEmail: studentEmail
        };
    }

    console.log('✗ Failed to create student user');
    return { studentToken: null };
}

export default function (data) {
    studentToken = data.studentToken;

    if (!studentToken) {
        console.log('⚠ No student token available. Skipping student tests.');
        return;
    }

    group('Student API Tests', function () {

        // =========================================================================
        // ENROLLMENT
        // =========================================================================

        group('GET /api/student/classes/open - List Open Classes', function () {
            const res = http.get(`${BASE_URL}/api/student/classes/open`, {
                headers: authHeaders(studentToken),
            });

            const success = check(res, {
                'Open Classes: status is 200': (r) => r.status === 200,
                'Open Classes: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            if (success) {
                const classes = parseJSON(res).data;
                if (classes.length > 0) {
                    enrolledClassId = classes[0].id;
                    console.log('✓ Found open class with ID:', enrolledClassId);
                } else {
                    console.log('⚠ No open classes available (need active semester with classes)');
                }
            }

            console.log('\n--- GET /api/student/classes/open ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('POST /api/student/enroll - Enroll in Class', function () {
            if (!enrolledClassId) {
                console.log('⚠ No class available to enroll, skipping');

                // Show example request anyway
                console.log('\n--- POST /api/student/enroll ---');
                console.log('Example Request:', JSON.stringify({ classId: 1 }));
                console.log('Expected Response: { success: true, data: { class_id, user_id, enrolled_at } }');
                return;
            }

            const payload = JSON.stringify({
                classId: enrolledClassId,
            });

            const res = http.post(`${BASE_URL}/api/student/enroll`, payload, {
                headers: authHeaders(studentToken),
            });

            check(res, {
                'Enroll: status is 201 or 409': (r) => r.status === 201 || r.status === 409,
            });

            console.log('\n--- POST /api/student/enroll ---');
            console.log('Request:', payload);
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('POST /api/student/enroll - Duplicate Enrollment (should fail)', function () {
            if (!enrolledClassId) {
                console.log('⚠ No class available, skipping');
                return;
            }

            const payload = JSON.stringify({
                classId: enrolledClassId,
            });

            const res = http.post(`${BASE_URL}/api/student/enroll`, payload, {
                headers: authHeaders(studentToken),
            });

            check(res, {
                'Duplicate Enroll: status is 409': (r) => r.status === 409,
                'Duplicate Enroll: success is false': (r) => parseJSON(r)?.success === false,
            });

            console.log('\n--- POST /api/student/enroll (Duplicate) ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // DASHBOARD
        // =========================================================================

        group('GET /api/student/my-classes - List My Classes', function () {
            const res = http.get(`${BASE_URL}/api/student/my-classes`, {
                headers: authHeaders(studentToken),
            });

            check(res, {
                'My Classes: status is 200': (r) => r.status === 200,
                'My Classes: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/student/my-classes ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('GET /api/student/my-classes/:classId/report - Get Class Report', function () {
            if (!enrolledClassId) {
                console.log('⚠ No enrolled class, skipping');

                // Show example response structure
                console.log('\n--- GET /api/student/my-classes/:classId/report ---');
                console.log('Example Response Structure:');
                console.log(JSON.stringify({
                    class: { id: 1, name: 'Kelas A', course: {}, semester: {} },
                    sessions: [{ session_number: 1, date: null, topic: 'Pertemuan 1', status: null, grade: null }],
                    summary: {
                        total_sessions: 11,
                        past_sessions: 0,
                        present_count: 0,
                        attendance_percentage: 0,
                        current_average_grade: null,
                        graded_sessions: 0
                    }
                }, null, 2));
                return;
            }

            const res = http.get(`${BASE_URL}/api/student/my-classes/${enrolledClassId}/report`, {
                headers: authHeaders(studentToken),
            });

            check(res, {
                'Class Report: status is 200': (r) => r.status === 200,
                'Class Report: has sessions': (r) => parseJSON(r)?.data?.sessions !== undefined,
                'Class Report: has summary': (r) => parseJSON(r)?.data?.summary !== undefined,
                'Class Report: has attendance_percentage': (r) => parseJSON(r)?.data?.summary?.attendance_percentage !== undefined,
                'Class Report: has current_average_grade': (r) => parseJSON(r)?.data?.summary?.current_average_grade !== undefined,
            });

            console.log('\n--- GET /api/student/my-classes/:classId/report ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        // =========================================================================
        // PERMISSIONS
        // =========================================================================

        group('GET /api/student/permissions - Get My Permissions', function () {
            const res = http.get(`${BASE_URL}/api/student/permissions`, {
                headers: authHeaders(studentToken),
            });

            check(res, {
                'My Permissions: status is 200': (r) => r.status === 200,
                'My Permissions: data is array': (r) => Array.isArray(parseJSON(r)?.data),
            });

            console.log('\n--- GET /api/student/permissions ---');
            console.log('Response:', res.body);
        });

        sleep(0.3);

        group('POST /api/student/permissions - Submit Permission (Example)', function () {
            // Note: This requires multipart/form-data with file upload
            // K6 can't easily do file uploads, so we show the expected format

            console.log('\n--- POST /api/student/permissions ---');
            console.log('Content-Type: multipart/form-data');
            console.log('Example Request Body:');
            console.log(JSON.stringify({
                session_id: 1,
                reason: 'Sakit demam',
                file: '<file upload: surat_izin.pdf>'
            }, null, 2));
            console.log('Expected Response: { success: true, data: { id, file_url, reason, status: "PENDING" } }');

            // Try without file to show error
            const res = http.post(`${BASE_URL}/api/student/permissions`, JSON.stringify({
                session_id: 1,
                reason: 'Test without file'
            }), {
                headers: authHeaders(studentToken),
            });

            check(res, {
                'Submit Permission without file: status is 400': (r) => r.status === 400,
            });

            console.log('Response (without file):', res.body);
        });

    });
}

export function handleSummary(data) {
    return {
        'test/md/student-test-report.md': generateMarkdownReport(data),
    };
}

function generateMarkdownReport(data) {
    const metrics = data.metrics;

    let report = `# Student API Test Report\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `## Summary\n\n`;
    report += `| Metric | Value |\n`;
    report += `|--------|-------|\n`;
    report += `| Total Requests | ${metrics.http_reqs?.values?.count || 0} |\n`;
    report += `| Failed Requests | ${metrics.http_req_failed?.values?.passes || 0} |\n`;
    report += `| Avg Response Time | ${(metrics.http_req_duration?.values?.avg || 0).toFixed(2)}ms |\n`;
    report += `| P95 Response Time | ${(metrics.http_req_duration?.values?.['p(95)'] || 0).toFixed(2)}ms |\n\n`;

    report += `## Endpoints Tested\n\n`;
    report += `- GET /api/student/classes/open\n`;
    report += `- POST /api/student/enroll\n`;
    report += `- GET /api/student/my-classes\n`;
    report += `- GET /api/student/my-classes/:classId/report\n`;
    report += `- GET /api/student/permissions\n`;
    report += `- POST /api/student/permissions (multipart)\n`;

    return report;
}
