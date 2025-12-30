import http from 'k6/http';
import { check } from 'k6';

const API_URL = 'https://practicum-sys-be.vercel.app';

export const options = {
  vus: 1,
  duration: '5s',
  thresholds: {
    http_req_duration: ['max<3000'],
  },
};

export default function () {
  // Test 1: Basic health check
  const healthRes = http.get(`${API_URL}`);
  check(healthRes, {
    'Health endpoint works': (r) => r.status === 200,
    'Returns valid JSON': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch {
        return false;
      }
    },
  });
  console.log(`Health: ${healthRes.status} | Duration: ${healthRes.timings.duration}ms`);

  // Test 2: Direct login test
  const loginRes = http.post(
    `${API_URL}/api/auth/login`,
    JSON.stringify({
      email: 'admin@practicum.com',
      password: 'admin123',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  console.log(`\nLogin Response:`);
  console.log(`Status: ${loginRes.status}`);
  console.log(`Duration: ${loginRes.timings.duration}ms`);
  console.log(`Body: ${loginRes.body.substring(0, 300)}`);

  check(loginRes, {
    'Login endpoint responds': (r) => [200, 401, 500].includes(r.status),
  });

  // Test 3: If login returned 500, it's a database issue
  if (loginRes.status === 500) {
    console.log('\n⚠️  CRITICAL: Login endpoint returning 500');
    console.log('Likely causes:');
    console.log('1. DATABASE_URL not set on Vercel');
    console.log('2. DIRECT_URL not set on Vercel');
    console.log('3. Database credentials are wrong');
    console.log('4. Database is not accessible from Vercel\n');
  }

  // Test 4: Check if it's a timeout (slow database)
  if (loginRes.timings.duration > 2000) {
    console.log('\n⚠️  SLOW RESPONSE: Login took > 2 seconds');
    console.log('Likely causes:');
    console.log('1. Connection pool exhausted');
    console.log('2. Database query is slow');
    console.log('3. Network latency to database\n');
  }
}
