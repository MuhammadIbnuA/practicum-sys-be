# K6 Test Documentation

## Test Files Overview

| File | Description | Endpoints Tested |
|------|-------------|------------------|
| `config.js` | Shared utilities, helpers, and configuration | - |
| `auth.test.js` | Authentication tests | 3 endpoints |
| `admin.test.js` | Admin module tests | 12 endpoints |
| `student.test.js` | Student module tests | 6 endpoints |
| `teaching.test.js` | Teaching module tests | 5 endpoints |
| `full-functional.test.js` | Complete E2E workflow test | All 29 endpoints |

---

## Prerequisites

1. **K6 Installation:**
   ```bash
   # Windows (winget)
   winget install k6
   
   # Or download from https://k6.io/docs/getting-started/installation/
   ```

2. **Server Running:**
   ```bash
   cd d:\DATA\DATA\Downloads\practium-sys\backend
   npm start
   ```

3. **Database Setup:**
   ```bash
   npx prisma db push
   ```

---

## Running Tests

### Run Individual Module Tests

```bash
cd d:\DATA\DATA\Downloads\practium-sys\backend

# Authentication tests
k6 run test/auth.test.js

# Admin tests (requires admin user in DB)
k6 run test/admin.test.js

# Student tests
k6 run test/student.test.js

# Teaching tests (requires assistant assignment)
k6 run test/teaching.test.js
```

### Run Full Functional Test

```bash
k6 run test/full-functional.test.js
```

This test creates all necessary data and tests the complete workflow:
1. Creates admin, student, and assistant users
2. Creates semester, course, and class
3. Tests enrollment flow
4. Tests teaching operations
5. Verifies student report with grades

---

## Test Reports

Reports are automatically generated in the `test/md/` folder:

| Test | Report File |
|------|-------------|
| auth.test.js | `md/auth-test-report.md` |
| admin.test.js | `md/admin-test-report.md` |
| student.test.js | `md/student-test-report.md` |
| teaching.test.js | `md/teaching-test-report.md` |
| full-functional.test.js | `md/full-test-report.md` |

---

## Admin User Setup

For admin tests to work, you need an admin user:

**Option 1: Manual Database Update**
```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@test.com';
```

**Option 2: Using Prisma Studio**
```bash
npx prisma studio
# Open browser, navigate to User table, set is_admin = true
```

---

## Test Configuration

Edit `test/config.js` to change:

```javascript
// Base URL
export const BASE_URL = 'http://localhost:3000';

// Test thresholds
export const defaultThresholds = {
  http_req_duration: ['p(95)<2000'], // 95% under 2s
  http_req_failed: ['rate<0.1'],     // <10% failure rate
};
```

---

## Endpoints Covered (29 Total)

### Authentication (3)
- ✅ POST /api/auth/register
- ✅ POST /api/auth/login
- ✅ GET /api/auth/me

### Admin (15)
- ✅ GET /api/admin/semesters
- ✅ POST /api/admin/semesters
- ✅ PUT /api/admin/semesters/:id/activate
- ✅ GET /api/admin/courses
- ✅ POST /api/admin/courses
- ✅ GET /api/admin/semesters/:semesterId/classes
- ✅ POST /api/admin/classes
- ✅ PUT /api/admin/classes/:classId
- ✅ POST /api/admin/classes/:classId/assistants
- ✅ DELETE /api/admin/classes/:classId/assistants/:userId
- ✅ GET /api/admin/permissions
- ✅ PUT /api/admin/permissions/:requestId/approve
- ✅ PUT /api/admin/permissions/:requestId/reject
- ✅ GET /api/admin/assistants/log
- ✅ POST /api/admin/assistants/validate

### Student (6)
- ✅ GET /api/student/classes/open
- ✅ POST /api/student/enroll
- ✅ GET /api/student/my-classes
- ✅ GET /api/student/my-classes/:classId/report
- ✅ POST /api/student/permissions
- ✅ GET /api/student/permissions

### Teaching (5)
- ✅ GET /api/teaching/schedule
- ✅ POST /api/teaching/check-in
- ✅ GET /api/teaching/classes/:classId/sessions
- ✅ GET /api/teaching/sessions/:sessionId/roster
- ✅ PUT /api/teaching/sessions/:sessionId/update-batch
