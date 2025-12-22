# API Request/Response Examples

This document contains example requests and responses for all API endpoints.

---

## Authentication API

### POST /api/auth/register

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Registration successful.",
  "data": {
    "user": {
      "id": 1,
      "email": "student@example.com",
      "name": "John Doe",
      "is_admin": false,
      "created_at": "2024-12-22T08:00:00.000Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### POST /api/auth/login

**Request:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "id": 1,
      "email": "student@example.com",
      "name": "John Doe",
      "is_admin": false
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### GET /api/auth/me

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Profile retrieved.",
  "data": {
    "id": 1,
    "email": "student@example.com",
    "name": "John Doe",
    "is_admin": false,
    "created_at": "2024-12-22T08:00:00.000Z",
    "_count": {
      "enrollments": 2,
      "classAssistants": 0
    }
  }
}
```

---

## Admin API

### POST /api/admin/semesters

**Request:**
```json
{
  "name": "Ganjil 2024/2025"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Semester created.",
  "data": {
    "id": 1,
    "name": "Ganjil 2024/2025",
    "is_active": false
  }
}
```

---

### PUT /api/admin/semesters/:id/activate

**Response (200):**
```json
{
  "success": true,
  "message": "Semester activated.",
  "data": {
    "id": 1,
    "name": "Ganjil 2024/2025",
    "is_active": true
  }
}
```

---

### POST /api/admin/courses

**Request:**
```json
{
  "code": "CS101",
  "name": "Dasar Pemrograman"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Course created.",
  "data": {
    "id": 1,
    "code": "CS101",
    "name": "Dasar Pemrograman"
  }
}
```

---

### POST /api/admin/classes

**Request:**
```json
{
  "course_id": 1,
  "semester_id": 1,
  "name": "Kelas A",
  "quota": 30,
  "day": "Monday",
  "time": "08:00-10:00",
  "room": "Lab 101"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Class created with 11 sessions.",
  "data": {
    "id": 1,
    "course_id": 1,
    "semester_id": 1,
    "name": "Kelas A",
    "quota": 30,
    "day": "Monday",
    "time": "08:00-10:00",
    "room": "Lab 101",
    "course": { "id": 1, "code": "CS101", "name": "Dasar Pemrograman" },
    "semester": { "id": 1, "name": "Ganjil 2024/2025", "is_active": true },
    "sessions": [
      { "id": 1, "session_number": 1, "topic": "Pertemuan 1", "type": "REGULAR" },
      { "id": 2, "session_number": 2, "topic": "Pertemuan 2", "type": "REGULAR" },
      "... (11 sessions total)",
      { "id": 11, "session_number": 11, "topic": "Responsi", "type": "EXAM" }
    ]
  }
}
```

---

### POST /api/admin/classes/:classId/assistants

**Request:**
```json
{
  "user_id": 5
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Assistant assigned.",
  "data": {
    "class_id": 1,
    "user_id": 5,
    "user": { "id": 5, "name": "Assistant Name", "email": "asst@example.com" },
    "class": { "id": 1, "name": "Kelas A" }
  }
}
```

---

### PUT /api/admin/permissions/:requestId/approve

**Request (optional):**
```json
{
  "new_status": "IZIN_SAKIT"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Permission approved. Attendance updated to IZIN_SAKIT.",
  "data": {
    "id": 1,
    "student_id": 2,
    "session_id": 3,
    "status": "APPROVED"
  }
}
```

---

## Student API

### GET /api/student/classes/open

**Response (200):**
```json
{
  "success": true,
  "message": "Open classes retrieved.",
  "data": [
    {
      "id": 1,
      "name": "Kelas A",
      "quota": 30,
      "day": "Monday",
      "time": "08:00-10:00",
      "room": "Lab 101",
      "course": { "id": 1, "code": "CS101", "name": "Dasar Pemrograman" },
      "enrolled_count": 25,
      "available_quota": 5,
      "is_available": true,
      "assistants": [
        { "user": { "id": 5, "name": "Assistant Name" } }
      ]
    }
  ]
}
```

---

### POST /api/student/enroll

**Request:**
```json
{
  "classId": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Successfully enrolled.",
  "data": {
    "class_id": 1,
    "user_id": 2,
    "enrolled_at": "2024-12-22T08:30:00.000Z",
    "class": {
      "id": 1,
      "name": "Kelas A",
      "course": { "code": "CS101", "name": "Dasar Pemrograman" }
    }
  }
}
```

---

### GET /api/student/my-classes/:classId/report

**Response (200):**
```json
{
  "success": true,
  "message": "Class report retrieved.",
  "data": {
    "class": {
      "id": 1,
      "name": "Kelas A",
      "day": "Monday",
      "time": "08:00-10:00",
      "room": "Lab 101",
      "course": { "code": "CS101", "name": "Dasar Pemrograman" }
    },
    "enrolled_at": "2024-12-22T08:30:00.000Z",
    "sessions": [
      { "session_number": 1, "date": null, "topic": "Pertemuan 1", "type": "REGULAR", "status": "HADIR", "grade": 85 },
      { "session_number": 2, "date": null, "topic": "Pertemuan 2", "type": "REGULAR", "status": "HADIR", "grade": 90 },
      { "session_number": 3, "date": null, "topic": "Pertemuan 3", "type": "REGULAR", "status": "ALPHA", "grade": null },
      "... (11 sessions total)"
    ],
    "summary": {
      "total_sessions": 11,
      "past_sessions": 3,
      "present_count": 2,
      "attendance_percentage": 66.67,
      "current_average_grade": 87.5,
      "graded_sessions": 2
    }
  }
}
```

---

### POST /api/student/permissions

**Content-Type:** multipart/form-data

**Form Fields:**
| Field | Type | Description |
|-------|------|-------------|
| session_id | number | Session ID to request permission for |
| reason | string | Reason for absence (e.g., "Sakit demam") |
| file | file | Permission letter (PDF, JPG, PNG) |

**Response (201):**
```json
{
  "success": true,
  "message": "Permission request submitted.",
  "data": {
    "id": 1,
    "student_id": 2,
    "session_id": 3,
    "file_url": "/uploads/1703234567-2-surat_izin.pdf",
    "reason": "Sakit demam",
    "status": "PENDING",
    "created_at": "2024-12-22T09:00:00.000Z"
  }
}
```

---

## Teaching API

### GET /api/teaching/schedule

**Response (200):**
```json
{
  "success": true,
  "message": "Teaching schedule retrieved.",
  "data": [
    {
      "id": 1,
      "name": "Kelas A",
      "day": "Monday",
      "time": "08:00-10:00",
      "room": "Lab 101",
      "course": { "code": "CS101", "name": "Dasar Pemrograman" },
      "semester": { "name": "Ganjil 2024/2025" },
      "student_count": 25,
      "sessions": [
        { "id": 1, "session_number": 1, "topic": "Pertemuan 1" }
      ]
    }
  ]
}
```

---

### POST /api/teaching/check-in

**Request:**
```json
{
  "session_id": 1
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Check-in successful.",
  "data": {
    "id": 1,
    "user_id": 5,
    "session_id": 1,
    "check_in_time": "2024-12-22T08:05:00.000Z",
    "status": "HADIR"
  }
}
```

---

### GET /api/teaching/sessions/:sessionId/roster

**Response (200):**
```json
{
  "success": true,
  "message": "Session roster retrieved.",
  "data": {
    "session": {
      "id": 1,
      "session_number": 1,
      "date": null,
      "topic": "Pertemuan 1",
      "type": "REGULAR"
    },
    "class": { "id": 1, "name": "Kelas A" },
    "student_count": 25,
    "roster": [
      {
        "student_id": 2,
        "student_name": "John Doe",
        "student_email": "john@example.com",
        "enrolled_at": "2024-12-22T08:30:00.000Z",
        "attendance": { "status": "HADIR", "grade": 85 }
      },
      {
        "student_id": 3,
        "student_name": "Jane Smith",
        "student_email": "jane@example.com",
        "enrolled_at": "2024-12-22T08:31:00.000Z",
        "attendance": null
      }
    ]
  }
}
```

---

### PUT /api/teaching/sessions/:sessionId/update-batch

**Request:**
```json
{
  "updates": [
    { "studentId": 2, "status": "HADIR", "grade": 85 },
    { "studentId": 3, "status": "HADIR", "grade": 90 },
    { "studentId": 4, "status": "ALPHA", "grade": null },
    { "studentId": 5, "status": "IZIN_SAKIT", "grade": null }
  ]
}
```

**Note:** Grade can only be assigned if status is "HADIR". Any grade for non-HADIR status will be ignored.

**Response (200):**
```json
{
  "success": true,
  "message": "Batch update complete. 4 updated, 0 failed.",
  "data": [
    { "studentId": 2, "success": true, "attendance": { "status": "HADIR", "grade": 85 } },
    { "studentId": 3, "success": true, "attendance": { "status": "HADIR", "grade": 90 } },
    { "studentId": 4, "success": true, "attendance": { "status": "ALPHA", "grade": null } },
    { "studentId": 5, "success": true, "attendance": { "status": "IZIN_SAKIT", "grade": null } }
  ]
}
```

---

## Attendance Status Values

| Status | Description |
|--------|-------------|
| `HADIR` | Present |
| `ALPHA` | Absent without permission |
| `IZIN_SAKIT` | Sick leave |
| `IZIN_LAIN` | Other leave |
| `IZIN_KAMPUS` | Official university business |

---

## Error Response Format

**Example (400 Bad Request):**
```json
{
  "success": false,
  "message": "Validation error message"
}
```

**Example (401 Unauthorized):**
```json
{
  "success": false,
  "message": "Access denied. No token provided."
}
```

**Example (403 Forbidden):**
```json
{
  "success": false,
  "message": "Access denied. Admin privileges required."
}
```

**Example (404 Not Found):**
```json
{
  "success": false,
  "message": "Resource not found."
}
```

**Example (409 Conflict):**
```json
{
  "success": false,
  "message": "Already enrolled in this class."
}
```
