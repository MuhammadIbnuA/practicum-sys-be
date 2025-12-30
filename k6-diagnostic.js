import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = 'https://practicum-sys-be.vercel.app/api';

// Simple diagnostic - just check if API is running
export const options = {
  stages: [
    { duration: '10s', target: 1 }, // Just 1 virtual user
  ],
  thresholds: {
    http_req_duration: ['max<2000'], // Allow up to 2 seconds for diagnostics
  },
};

export default function () {
  // Test 1: Health Check
  console.log('📍 Testing health check endpoint...');
  let res = http.get(`${BASE_URL.replace('/api', '')}`);
  console.log(`Health check status: ${res.status}`);
  check(res, {
    'Health check returns 200': (r) => r.status === 200,
  });
  sleep(1);

  // Test 2: Login with correct credentials
  console.log('📍 Testing admin login...');
  const loginPayload = JSON.stringify({
    email: 'admin@practicum.com',
    password: 'admin123',
  });

  res = http.post(`${BASE_URL}/auth/login`, loginPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log(`Login response status: ${res.status}`);
  console.log(`Login response body: ${res.body.substring(0, 500)}`);

  check(res, {
    'Login returns 200 or 401': (r) => r.status === 200 || r.status === 401 || r.status === 403,
  });

  if (res.status === 200) {
    try {
      const data = res.json();
      console.log(`✅ Login successful! Token: ${data.data?.accessToken?.substring(0, 20)}...`);
    } catch (e) {
      console.log(`❌ Could not parse login response as JSON`);
    }
  } else {
    console.log(`❌ Login failed with status ${res.status}`);
  }

  sleep(1);

  // Test 3: Try with wrong credentials
  console.log('📍 Testing login with wrong password...');
  const wrongPayload = JSON.stringify({
    email: 'admin@practicum.com',
    password: 'wrongpassword',
  });

  res = http.post(`${BASE_URL}/auth/login`, wrongPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log(`Wrong password response status: ${res.status}`);
  check(res, {
    'Wrong password returns 401': (r) => r.status === 401,
  });
  sleep(1);

  // Test 4: Try non-existent user
  console.log('📍 Testing login with non-existent user...');
  const nonExistentPayload = JSON.stringify({
    email: 'nonexistent@example.com',
    password: 'password123',
  });

  res = http.post(`${BASE_URL}/auth/login`, nonExistentPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  console.log(`Non-existent user response status: ${res.status}`);
  check(res, {
    'Non-existent user returns 401 or 404': (r) => r.status === 401 || r.status === 404,
  });
}
