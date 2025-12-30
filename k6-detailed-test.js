import http from 'k6/http';
import { check, group, sleep } from 'k6';

const BASE_URL = 'https://practicum-sys-be.vercel.app/api';

// Single user load test - identify bottlenecks
export const options = {
  stages: [
    { duration: '30s', target: 1 },   // 1 user for 30s
    { duration: '1m', target: 3 },    // 3 users for 1m
    { duration: '1m', target: 5 },    // 5 users for 1m
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // Loosen threshold since Vercel is slow
    http_req_failed: ['rate<0.2'],      // Allow 20% failure rate for diagnostics
  },
};

let adminToken = '';
let studentToken = '';

export default function () {
  // ========================================================================
  // 1. AUTHENTICATION TESTS
  // ========================================================================
  group('1️⃣ AUTHENTICATION - Login Performance', () => {
    
    group('Admin Login', () => {
      const startTime = Date.now();
      const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
          email: 'admin@practicum.com',
          password: 'admin123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      const duration = Date.now() - startTime;

      console.log(`⏱️  Admin Login: ${duration}ms | Status: ${res.status}`);

      check(res, {
        'Admin login status 200': (r) => r.status === 200,
        'Admin login response < 1000ms': (r) => r.timings.duration < 1000,
      });

      if (res.status === 200) {
        try {
          adminToken = res.json('data.accessToken');
          console.log(`✅ Admin token obtained`);
        } catch (e) {
          console.log(`❌ Failed to parse admin token`);
        }
      }
    });

    sleep(1);

    group('Student Login', () => {
      const startTime = Date.now();
      const res = http.post(
        `${BASE_URL}/auth/login`,
        JSON.stringify({
          email: 'student1@example.com',
          password: 'password123',
        }),
        { headers: { 'Content-Type': 'application/json' } }
      );
      const duration = Date.now() - startTime;

      console.log(`⏱️  Student Login: ${duration}ms | Status: ${res.status}`);

      check(res, {
        'Student login status 200': (r) => r.status === 200,
        'Student login response < 1000ms': (r) => r.timings.duration < 1000,
      });

      if (res.status === 200) {
        try {
          studentToken = res.json('data.accessToken');
          console.log(`✅ Student token obtained`);
        } catch (e) {
          console.log(`❌ Failed to parse student token`);
        }
      }
    });
  });

  sleep(1);

  // ========================================================================
  // 2. ADMIN ENDPOINTS - List Operations
  // ========================================================================
  if (adminToken) {
    group('2️⃣ ADMIN ENDPOINTS - List Operations', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      };

      const endpoints = [
        { name: 'Semesters', url: '/admin/semesters', threshold: 300 },
        { name: 'Courses', url: '/admin/courses', threshold: 300 },
        { name: 'Rooms', url: '/admin/rooms', threshold: 300 },
        { name: 'Time Slots', url: '/admin/time-slots', threshold: 300 },
        { name: 'Classes', url: '/admin/classes', threshold: 800 },
        { name: 'Permissions', url: '/admin/permissions', threshold: 1000 },
      ];

      endpoints.forEach((endpoint) => {
        group(`GET ${endpoint.name}`, () => {
          const startTime = Date.now();
          const res = http.get(`${BASE_URL}${endpoint.url}`, { headers });
          const duration = Date.now() - startTime;

          console.log(
            `⏱️  ${endpoint.name}: ${duration}ms | Status: ${res.status} | Threshold: ${endpoint.threshold}ms ${
              duration > endpoint.threshold ? '⚠️ SLOW' : '✅'
            }`
          );

          check(res, {
            [`${endpoint.name} status 200`]: (r) => r.status === 200,
            [`${endpoint.name} < ${endpoint.threshold}ms`]: (r) =>
              r.timings.duration < endpoint.threshold,
          });
        });

        sleep(0.5);
      });
    });
  }

  sleep(1);

  // ========================================================================
  // 3. STUDENT ENDPOINTS - List Operations
  // ========================================================================
  if (studentToken) {
    group('3️⃣ STUDENT ENDPOINTS - List Operations', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`,
      };

      const endpoints = [
        { name: 'Profile (Me)', url: '/auth/me', threshold: 300 },
        { name: 'My Classes', url: '/student/classes', threshold: 500 },
        { name: 'My Schedule', url: '/student/schedule', threshold: 500 },
        { name: 'Open Classes', url: '/student/open-classes', threshold: 800 },
        { name: 'My Recap', url: '/student/recap', threshold: 500 },
        { name: 'My Permissions', url: '/student/permissions', threshold: 500 },
      ];

      endpoints.forEach((endpoint) => {
        group(`GET ${endpoint.name}`, () => {
          const startTime = Date.now();
          const res = http.get(`${BASE_URL}${endpoint.url}`, { headers });
          const duration = Date.now() - startTime;

          console.log(
            `⏱️  ${endpoint.name}: ${duration}ms | Status: ${res.status} | Threshold: ${endpoint.threshold}ms ${
              duration > endpoint.threshold ? '⚠️ SLOW' : '✅'
            }`
          );

          check(res, {
            [`${endpoint.name} status 200`]: (r) => r.status === 200,
            [`${endpoint.name} < ${endpoint.threshold}ms`]: (r) =>
              r.timings.duration < endpoint.threshold,
          });
        });

        sleep(0.5);
      });
    });
  }

  sleep(1);

  // ========================================================================
  // 4. TEACHING ENDPOINTS
  // ========================================================================
  if (studentToken) {
    group('4️⃣ TEACHING ENDPOINTS', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`,
      };

      group('GET Teaching Schedule', () => {
        const startTime = Date.now();
        const res = http.get(`${BASE_URL}/teaching/schedule`, { headers });
        const duration = Date.now() - startTime;

        console.log(`⏱️  Teaching Schedule: ${duration}ms | Status: ${res.status}`);

        check(res, {
          'Teaching schedule status 200': (r) => r.status === 200,
        });
      });

      sleep(0.5);

      group('GET Teaching Classes', () => {
        const startTime = Date.now();
        const res = http.get(`${BASE_URL}/teaching/classes`, { headers });
        const duration = Date.now() - startTime;

        console.log(`⏱️  Teaching Classes: ${duration}ms | Status: ${res.status}`);

        check(res, {
          'Teaching classes status 200': (r) => r.status === 200,
        });
      });
    });
  }
}

export function handleSummary(data) {
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║              K6 PERFORMANCE TEST SUMMARY               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const metrics = data.metrics;

  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration.values;
    console.log('⏱️  RESPONSE TIME STATISTICS:');
    console.log(`   Average:  ${Math.round(duration.avg)}ms`);
    console.log(`   Min:      ${Math.round(duration.min)}ms`);
    console.log(`   Max:      ${Math.round(duration.max)}ms`);
    console.log(`   P95:      ${Math.round(duration['p(95)'])}ms`);
    console.log(`   P99:      ${Math.round(duration['p(99)'] || 0)}ms\n`);
  }

  if (metrics.http_reqs) {
    console.log('📊 REQUEST STATISTICS:');
    console.log(`   Total Requests: ${metrics.http_reqs.value}`);
    console.log(
      `   Request Rate:   ${Math.round(
        metrics.http_reqs.value / (data.state.testRunDurationMs / 1000)
      )} req/s\n`
    );
  }

  if (metrics.http_req_failed) {
    console.log('❌ FAILURE STATISTICS:');
    console.log(`   Failed Requests: ${metrics.http_req_failed.value}`);
    console.log(
      `   Failure Rate:    ${(metrics.http_req_failed.values.rate * 100).toFixed(
        2
      )}%\n`
    );
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}
