# Admin API Test Report

**Generated:** 2026-01-02T16:04:04.589Z

## Summary

| Metric | Value |
|--------|-------|
| Total Requests | 11 |
| Failed Requests | 2 |
| Avg Response Time | 617.58ms |
| P95 Response Time | 1460.55ms |

## Endpoints Tested

- POST /api/admin/semesters
- GET /api/admin/semesters
- PUT /api/admin/semesters/:id/activate
- POST /api/admin/courses
- GET /api/admin/courses
- POST /api/admin/classes
- GET /api/admin/semesters/:semesterId/classes
- PUT /api/admin/classes/:classId
- POST /api/admin/classes/:classId/assistants
- DELETE /api/admin/classes/:classId/assistants/:userId
- GET /api/admin/permissions
- GET /api/admin/assistants/log
