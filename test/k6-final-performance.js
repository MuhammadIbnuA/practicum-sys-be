import http from 'k6/http';
import { check, group, sleep } from 'k6';

// Test configuration
export const options = {
    stages: [
        { duration: '30s', target: 5 },   // Ramp up to 5 concurrent users
        { duration: '30s', target: 10 },  // Ramp up to 10 users
        { duration: '60s', target: 10 },  // Hold at 10 users
        { duration: '30s', target: 0 }    // Ramp down to 0
    ],
    thresholds: {
        http_req_duration: ['p(95)<2000'],  // 95% should be below 2 seconds
        http_req_failed: ['rate<0.1'],      // Less than 10% failures
    }
};

const BASE_URL = __ENV.BASE_URL || 'https://practicum-sys-be.vercel.app';

export default function () {
    const loginPayload = JSON.stringify({
        email: 'student1@student.com',
        password: 'password123'
    });

    // Login
    let loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
        headers: { 'Content-Type': 'application/json' }
    });

    const token = loginRes.json('data.accessToken');

    check(loginRes, {
        'login status is 200': (r) => r.status === 200,
        'token received': () => token !== undefined
    });

    sleep(0.5);

    const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    // Test 1: Get semesters (cached endpoint)
    group('Get Semesters (Cached)', () => {
        let res = http.get(`${BASE_URL}/api/admin/semesters`, { headers });
        check(res, {
            'status is 200': (r) => r.status === 200,
            'has pagination': (r) => r.json('pagination') !== undefined,
            'has data': (r) => r.json('data') !== undefined
        });
    });
    sleep(0.3);

    // Test 2: Get courses (cached endpoint)
    group('Get Courses (Cached)', () => {
        let res = http.get(`${BASE_URL}/api/admin/courses`, { headers });
        check(res, {
            'status is 200': (r) => r.status === 200,
            'has pagination': (r) => r.json('pagination') !== undefined,
        });
    });
    sleep(0.3);

    // Test 3: Get classes with pagination
    group('Get Classes (Paginated)', () => {
        let res = http.get(`${BASE_URL}/api/admin/classes/1?page=1&limit=10`, { headers });
        check(res, {
            'status is 200': (r) => r.status === 200,
            'has pagination': (r) => r.json('pagination') !== undefined,
            'is paginated': (r) => r.json('pagination.limit') === 10
        });
    });
    sleep(0.3);

    // Test 4: Get student's classes (with pagination)
    group('Get My Classes (Student)', () => {
        let res = http.get(`${BASE_URL}/api/student/classes?page=1&limit=20`, { headers });
        check(res, {
            'status is 200': (r) => r.status === 200,
            'has data': (r) => Array.isArray(r.json('data')) || r.json('data') !== undefined
        });
    });
    sleep(0.3);

    // Test 5: Get teaching schedule (with pagination)
    group('Get Teaching Schedule (Paginated)', () => {
        let res = http.get(`${BASE_URL}/api/teaching/schedule?page=1&limit=10`, { headers });
        check(res, {
            'status is 200': (r) => r.status === 200,
        });
    });
    sleep(0.3);

    // Test 6: Get time slots
    group('Get Time Slots', () => {
        let res = http.get(`${BASE_URL}/api/admin/time-slots`, { headers });
        check(res, {
            'status is 200': (r) => r.status === 200,
            'is array': (r) => Array.isArray(r.json()) || r.json() !== undefined
        });
    });
    sleep(0.3);

    // Test 7: Concurrent requests simulation
    group('Concurrent Load Test', () => {
        let requests = [
            { method: 'GET', url: `${BASE_URL}/api/admin/semesters` },
            { method: 'GET', url: `${BASE_URL}/api/admin/courses` },
            { method: 'GET', url: `${BASE_URL}/api/admin/time-slots` },
            { method: 'GET', url: `${BASE_URL}/api/student/classes?page=1&limit=10` }
        ];

        let responses = http.batch(
            requests.map(req => [req.method, req.url, null, { headers }])
        );

        responses.forEach((res, i) => {
            check(res, {
                [`concurrent request ${i+1} successful`]: (r) => r.status === 200
            });
        });
    });

    sleep(1);
}
