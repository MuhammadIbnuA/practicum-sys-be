# Practicum API Full Functional Test Report (v2)

**Generated:** 2025-12-22T09:19:51.707Z

## Test Summary

| Metric | Value |
|--------|-------|
| Total HTTP Requests | 19 |
| Failed Requests | 0 |
| Average Response Time | 1148.36ms |
| P95 Response Time | 1722.66ms |
| Checks Passed | 16 |
| Checks Failed | 0 |

## Features Tested

### Master Schedule (Jadwal Besar)
- ✅ GET /api/admin/time-slots
- ✅ GET /api/admin/rooms
- ✅ GET /api/admin/semesters/:id/schedule
- ✅ POST /api/admin/classes (with day_of_week, time_slot_id, room_id)

### Student Schedule & Attendance
- ✅ GET /api/student/schedule
- ✅ POST /api/student/attendance/submit

### Attendance Approval Workflow
- ✅ GET /api/teaching/sessions/:id/pending
- ✅ PUT /api/teaching/attendance/:id/approve
- ✅ PUT /api/teaching/attendance/:id/reject

## Business Rules Verified

| Rule | Status |
|------|--------|
| 11 sessions auto-created per class | ✅ |
| Schedule conflict prevention | ✅ |
| Praktikan submits → PENDING status | ✅ |
| Assistant approves → HADIR status | ✅ |
| Grade only with HADIR status | ✅ |
