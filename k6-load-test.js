import http from 'k6/http';
import { check, group } from 'k6';

// Configuration
const BASE_URL = 'https://practicum-sys-be.vercel.app/api';
const ADMIN_EMAIL = 'admin@practicum.com';
const ADMIN_PASSWORD = 'admin123';
// Use the first student from seed data
const STUDENT_EMAIL = 'student1@example.com';
const STUDENT_PASSWORD = 'password123';

// Load testing configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 20 },    // Ramp up to 20 users
    { duration: '30s', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% requests < 500ms, 99% < 1000ms
    http_req_failed: ['rate<0.1'],                   // Error rate < 10%
  },
};

// Global variable to store auth token
let authToken = '';
let studentToken = '';
let userId = 0;
let classId = 0;

export default function () {
  // Phase 1: Authentication
  group('Authentication', () => {
    // Admin Login
    group('Admin Login', () => {
      const loginPayload = JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      });

      const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'AdminLogin' },
      };

      const response = http.post(`${BASE_URL}/auth/login`, loginPayload, params);

      if (response.status !== 200) {
        console.log(`Admin login failed with status ${response.status}: ${response.body}`);
      }

      check(response, {
        'Admin login status is 200': (r) => r.status === 200,
        'Admin login returns token': (r) => r.json('data.accessToken') !== undefined,
        'Admin login response time < 500ms': (r) => r.timings.duration < 500,
      });

      if (response.status === 200) {
        authToken = response.json('data.accessToken');
        userId = response.json('data.user.id');
      }
    });

    // Student Login
    group('Student Login', () => {
      const loginPayload = JSON.stringify({
        email: STUDENT_EMAIL,
        password: STUDENT_PASSWORD,
      });

      const params = {
        headers: { 'Content-Type': 'application/json' },
        tags: { name: 'StudentLogin' },
      };

      const response = http.post(`${BASE_URL}/auth/login`, loginPayload, params);

      check(response, {
        'Student login status is 200': (r) => r.status === 200,
        'Student login returns token': (r) => r.json('data.accessToken') !== undefined,
      });

      if (response.status === 200) {
        studentToken = response.json('data.accessToken');
      }
    });
  });

  // Phase 2: Admin Operations
  if (authToken) {
    group('Admin Operations', () => {
      const adminHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      };

      // Get Semesters
      group('Get Semesters', () => {
        const response = http.get(`${BASE_URL}/admin/semesters`, {
          headers: adminHeaders,
          tags: { name: 'GetSemesters' },
        });

        check(response, {
          'Get semesters status is 200': (r) => r.status === 200,
          'Get semesters returns data': (r) => r.json('data') !== undefined,
          'Get semesters response time < 300ms': (r) => r.timings.duration < 300,
        });
      });

      // Get Courses
      group('Get Courses', () => {
        const response = http.get(`${BASE_URL}/admin/courses`, {
          headers: adminHeaders,
          tags: { name: 'GetCourses' },
        });

        check(response, {
          'Get courses status is 200': (r) => r.status === 200,
          'Get courses returns data': (r) => r.json('data') !== undefined,
          'Get courses response time < 300ms': (r) => r.timings.duration < 300,
        });
      });

      // Get All Classes
      group('Get All Classes', () => {
        const response = http.get(`${BASE_URL}/admin/classes`, {
          headers: adminHeaders,
          tags: { name: 'GetAllClasses' },
        });

        check(response, {
          'Get all classes status is 200': (r) => r.status === 200,
          'Get all classes returns data': (r) => r.json('data') !== undefined,
          'Get all classes response time < 1000ms': (r) => r.timings.duration < 1000,
        });

        if (response.status === 200) {
          const classes = response.json('data');
          if (classes && classes.length > 0) {
            classId = classes[0].id;
          }
        }
      });

      // Get Time Slots
      group('Get Time Slots', () => {
        const response = http.get(`${BASE_URL}/admin/time-slots`, {
          headers: adminHeaders,
          tags: { name: 'GetTimeSlots' },
        });

        check(response, {
          'Get time slots status is 200': (r) => r.status === 200,
          'Get time slots response time < 300ms': (r) => r.timings.duration < 300,
        });
      });

      // Get Rooms
      group('Get Rooms', () => {
        const response = http.get(`${BASE_URL}/admin/rooms`, {
          headers: adminHeaders,
          tags: { name: 'GetRooms' },
        });

        check(response, {
          'Get rooms status is 200': (r) => r.status === 200,
          'Get rooms response time < 300ms': (r) => r.timings.duration < 300,
        });
      });

      // Get Master Schedule
      group('Get Master Schedule', () => {
        const response = http.get(`${BASE_URL}/admin/schedule/1`, {
          headers: adminHeaders,
          tags: { name: 'GetMasterSchedule' },
        });

        check(response, {
          'Get master schedule status is 200': (r) => r.status === 200,
          'Get master schedule response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get Permissions
      group('Get Permissions', () => {
        const response = http.get(`${BASE_URL}/admin/permissions`, {
          headers: adminHeaders,
          tags: { name: 'GetPermissions' },
        });

        check(response, {
          'Get permissions status is 200': (r) => r.status === 200,
          'Get permissions response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get Assistant Logs
      group('Get Assistant Logs', () => {
        const response = http.get(`${BASE_URL}/admin/assistant-logs`, {
          headers: adminHeaders,
          tags: { name: 'GetAssistantLogs' },
        });

        check(response, {
          'Get assistant logs status is 200': (r) => r.status === 200,
          'Get assistant logs response time < 1000ms': (r) => r.timings.duration < 1000,
        });
      });
    });
  }

  // Phase 3: Student Operations
  if (studentToken) {
    group('Student Operations', () => {
      const studentHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`,
      };

      // Get Profile
      group('Get Student Profile', () => {
        const response = http.get(`${BASE_URL}/auth/me`, {
          headers: studentHeaders,
          tags: { name: 'GetProfile' },
        });

        check(response, {
          'Get profile status is 200': (r) => r.status === 200,
          'Get profile returns user data': (r) => r.json('data.email') !== undefined,
          'Get profile response time < 300ms': (r) => r.timings.duration < 300,
        });
      });

      // Get My Classes
      group('Get My Classes', () => {
        const response = http.get(`${BASE_URL}/student/classes`, {
          headers: studentHeaders,
          tags: { name: 'GetMyClasses' },
        });

        check(response, {
          'Get my classes status is 200': (r) => r.status === 200,
          'Get my classes returns data': (r) => r.json('data') !== undefined,
          'Get my classes response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get My Schedule
      group('Get My Schedule', () => {
        const response = http.get(`${BASE_URL}/student/schedule`, {
          headers: studentHeaders,
          tags: { name: 'GetMySchedule' },
        });

        check(response, {
          'Get my schedule status is 200': (r) => r.status === 200,
          'Get my schedule response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get Open Classes
      group('Get Open Classes', () => {
        const response = http.get(`${BASE_URL}/student/open-classes`, {
          headers: studentHeaders,
          tags: { name: 'GetOpenClasses' },
        });

        check(response, {
          'Get open classes status is 200': (r) => r.status === 200,
          'Get open classes response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get My Recap
      group('Get My Recap', () => {
        const response = http.get(`${BASE_URL}/student/recap`, {
          headers: studentHeaders,
          tags: { name: 'GetMyRecap' },
        });

        check(response, {
          'Get my recap status is 200': (r) => r.status === 200,
          'Get my recap response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get Permissions
      group('Get My Permissions', () => {
        const response = http.get(`${BASE_URL}/student/permissions`, {
          headers: studentHeaders,
          tags: { name: 'GetMyPermissions' },
        });

        check(response, {
          'Get my permissions status is 200': (r) => r.status === 200,
          'Get my permissions response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get Class Detail
      if (classId > 0) {
        group('Get Class Detail', () => {
          const response = http.get(`${BASE_URL}/student/class/${classId}`, {
            headers: studentHeaders,
            tags: { name: 'GetClassDetail' },
          });

          check(response, {
            'Get class detail status is 200': (r) => r.status === 200 || r.status === 404,
            'Get class detail response time < 500ms': (r) => r.timings.duration < 500,
          });
        });
      }
    });
  }

  // Phase 4: Teaching Operations
  if (studentToken) {
    group('Teaching Operations', () => {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${studentToken}`,
      };

      // Get Teaching Schedule
      group('Get Teaching Schedule', () => {
        const response = http.get(`${BASE_URL}/teaching/schedule`, {
          headers: headers,
          tags: { name: 'GetTeachingSchedule' },
        });

        check(response, {
          'Get teaching schedule status is 200': (r) => r.status === 200,
          'Get teaching schedule response time < 500ms': (r) => r.timings.duration < 500,
        });
      });

      // Get Teaching Classes
      group('Get Teaching Classes', () => {
        const response = http.get(`${BASE_URL}/teaching/classes`, {
          headers: headers,
          tags: { name: 'GetTeachingClasses' },
        });

        check(response, {
          'Get teaching classes status is 200': (r) => r.status === 200,
          'Get teaching classes response time < 500ms': (r) => r.timings.duration < 500,
        });
      });
    });
  }
}

// Summary function
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
  };
}

// Custom text summary
function textSummary(data, options) {
  let summary = '\n\n=== K6 Load Test Summary ===\n\n';

  // Extract metrics
  const metrics = data.metrics;

  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration.values;
    summary += `Response Time:\n`;
    summary += `  - Average: ${Math.round(duration.avg)}ms\n`;
    summary += `  - Min: ${Math.round(duration.min)}ms\n`;
    summary += `  - Max: ${Math.round(duration.max)}ms\n`;
    summary += `  - P95: ${Math.round(duration['p(95)'])}ms\n`;
    summary += `  - P99: ${Math.round(duration['p(99)'])}ms\n\n`;
  }

  if (metrics.http_reqs) {
    summary += `Requests:\n`;
    summary += `  - Total: ${metrics.http_reqs.value}\n`;
    summary += `  - Rate: ${Math.round(metrics.http_reqs.value / (data.state.testRunDurationMs / 1000))} req/s\n\n`;
  }

  if (metrics.http_req_failed) {
    summary += `Failures:\n`;
    summary += `  - Failed Requests: ${metrics.http_req_failed.value}\n`;
    summary += `  - Failure Rate: ${(metrics.http_req_failed.values.rate * 100).toFixed(2)}%\n\n`;
  }

  summary += `\nTest Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += '============================\n';

  return summary;
}
