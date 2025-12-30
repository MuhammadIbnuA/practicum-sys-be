import http from 'k6/http';
import { check } from 'k6';

const API_URL = 'https://practicum-sys-be.vercel.app/api';

// Single sequential requests to measure pure DB latency
export const options = {
  vus: 1,
  duration: '2m',
  thresholds: {
    http_req_duration: ['max<10000'],
  },
};

let adminToken = '';
let iterations = 0;

export default function () {
  iterations++;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`ITERATION ${iterations} - Sequential Requests`);
  console.log(`${'='.repeat(60)}`);

  // Step 1: Login (get token)
  console.log(`\n📝 Step 1: Admin Login`);
  const loginRes = http.post(
    `${API_URL}/auth/login`,
    JSON.stringify({
      email: 'admin@practicum.com',
      password: 'admin123',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  console.log(`Status: ${loginRes.status} | Duration: ${loginRes.timings.duration}ms`);

  if (loginRes.status === 200) {
    try {
      adminToken = loginRes.json('data.accessToken');
    } catch (e) {
      console.log('Failed to get token');
      return;
    }
  } else {
    console.log('Login failed, skipping endpoint tests');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${adminToken}`,
  };

  // Test simple endpoints one by one
  const endpoints = [
    { name: 'Semesters', url: '/admin/semesters' },
    { name: 'Courses', url: '/admin/courses' },
    { name: 'Rooms', url: '/admin/rooms' },
    { name: 'Time Slots', url: '/admin/time-slots' },
    { name: 'Classes', url: '/admin/classes' },
    { name: 'Permissions', url: '/admin/permissions' },
  ];

  endpoints.forEach((endpoint, idx) => {
    console.log(`\n📊 Step ${idx + 2}: GET ${endpoint.name}`);

    const startTime = Date.now();
    const res = http.get(`${API_URL}${endpoint.url}`, { headers });
    const duration = Date.now() - startTime;

    console.log(`Status: ${res.status} | Duration: ${duration}ms`);

    // Try to parse response size
    try {
      const size = res.body.length;
      console.log(`Response size: ${size} bytes`);
    } catch (e) {
      console.log('Could not parse response size');
    }

    check(res, {
      [`${endpoint.name} status 200`]: (r) => r.status === 200,
    });
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`END OF ITERATION ${iterations}`);
  console.log(`${'='.repeat(60)}\n`);
}

export function handleSummary(data) {
  console.log('\n\n╔════════════════════════════════════════════════════════╗');
  console.log('║              DIAGNOSTIC TEST SUMMARY                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  console.log('📌 KEY FINDINGS:\n');

  const metrics = data.metrics;

  if (metrics.http_req_duration) {
    const duration = metrics.http_req_duration.values;
    console.log('⏱️  RESPONSE TIMES:');
    console.log(`   Average:     ${Math.round(duration.avg)}ms`);
    console.log(`   Min:         ${Math.round(duration.min)}ms`);
    console.log(`   Max:         ${Math.round(duration.max)}ms`);
    console.log(`   P50 (Median):${Math.round(duration['p(50)'])}ms`);
    console.log(`   P95:         ${Math.round(duration['p(95)'])}ms\n`);

    // Diagnosis
    if (duration.avg > 1500) {
      console.log('🔴 DIAGNOSIS: Database connection issue (Vercel Postgres)\n');
      console.log('Symptoms:');
      console.log('- All endpoints slow equally (no N+1 query problem)');
      console.log('- Simple queries (Semesters) take 1000+ ms');
      console.log('- Consistent delay pattern suggests connection pool exhaustion\n');
      console.log('Solutions:');
      console.log('1. Add DIRECT_URL environment variable on Vercel');
      console.log('2. Upgrade Vercel Postgres to paid tier (more connections)');
      console.log('3. Implement connection pooling with PgBouncer');
      console.log('4. Use serverless-compatible connection pool library\n');
    } else if (duration.avg > 500) {
      console.log('🟡 DIAGNOSIS: Moderate latency (could be network)\n');
    } else {
      console.log('✅ DIAGNOSIS: Performance is good\n');
    }
  }

  if (metrics.http_reqs) {
    console.log(`📊 REQUESTS: ${metrics.http_reqs.value} total\n`);
  }

  console.log('═══════════════════════════════════════════════════════════\n');
}
