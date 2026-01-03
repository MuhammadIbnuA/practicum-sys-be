-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PENDING', 'HADIR', 'ALPHA', 'IZIN_SAKIT', 'IZIN_LAIN', 'IZIN_KAMPUS', 'REJECTED');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('REGULAR', 'EXAM');

-- CreateEnum
CREATE TYPE "PermissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "nim" TEXT,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "is_admin" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "semesters" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "semesters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "courses" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "time_slots" (
    "id" SERIAL NOT NULL,
    "slot_number" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "time_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" SERIAL NOT NULL,
    "course_id" INTEGER NOT NULL,
    "semester_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quota" INTEGER NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "time_slot_id" INTEGER NOT NULL,
    "room_id" INTEGER NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_assistants" (
    "class_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,

    CONSTRAINT "class_assistants_pkey" PRIMARY KEY ("class_id","user_id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" SERIAL NOT NULL,
    "class_id" INTEGER NOT NULL,
    "session_number" INTEGER NOT NULL,
    "date" TIMESTAMP(3),
    "topic" TEXT,
    "type" "SessionType" NOT NULL DEFAULT 'REGULAR',
    "is_finalized" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "class_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("class_id","user_id")
);

-- CreateTable
CREATE TABLE "student_attendances" (
    "id" SERIAL NOT NULL,
    "enrollment_class_id" INTEGER NOT NULL,
    "enrollment_user_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ALPHA',
    "grade" DOUBLE PRECISION,
    "proof_file_url" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_by_id" INTEGER,
    "approved_at" TIMESTAMP(3),

    CONSTRAINT "student_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_attendances" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "check_in_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'HADIR',

    CONSTRAINT "assistant_attendances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permission_requests" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_data" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PermissionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_nim_key" ON "users"("nim");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_nim_idx" ON "users"("nim");

-- CreateIndex
CREATE INDEX "users_is_admin_idx" ON "users"("is_admin");

-- CreateIndex
CREATE INDEX "semesters_is_active_idx" ON "semesters"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "courses_code_key" ON "courses"("code");

-- CreateIndex
CREATE UNIQUE INDEX "time_slots_slot_number_key" ON "time_slots"("slot_number");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");

-- CreateIndex
CREATE INDEX "classes_course_id_idx" ON "classes"("course_id");

-- CreateIndex
CREATE INDEX "classes_semester_id_idx" ON "classes"("semester_id");

-- CreateIndex
CREATE INDEX "classes_time_slot_id_idx" ON "classes"("time_slot_id");

-- CreateIndex
CREATE INDEX "classes_room_id_idx" ON "classes"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_course_id_semester_id_name_key" ON "classes"("course_id", "semester_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "classes_semester_id_day_of_week_time_slot_id_room_id_key" ON "classes"("semester_id", "day_of_week", "time_slot_id", "room_id");

-- CreateIndex
CREATE INDEX "class_sessions_class_id_idx" ON "class_sessions"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_sessions_class_id_session_number_key" ON "class_sessions"("class_id", "session_number");

-- CreateIndex
CREATE INDEX "enrollments_user_id_idx" ON "enrollments"("user_id");

-- CreateIndex
CREATE INDEX "student_attendances_session_id_idx" ON "student_attendances"("session_id");

-- CreateIndex
CREATE INDEX "student_attendances_status_idx" ON "student_attendances"("status");

-- CreateIndex
CREATE UNIQUE INDEX "student_attendances_enrollment_class_id_enrollment_user_id__key" ON "student_attendances"("enrollment_class_id", "enrollment_user_id", "session_id");

-- CreateIndex
CREATE UNIQUE INDEX "assistant_attendances_user_id_session_id_key" ON "assistant_attendances"("user_id", "session_id");

-- CreateIndex
CREATE INDEX "permission_requests_session_id_idx" ON "permission_requests"("session_id");

-- CreateIndex
CREATE INDEX "permission_requests_status_idx" ON "permission_requests"("status");

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_semester_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_time_slot_id_fkey" FOREIGN KEY ("time_slot_id") REFERENCES "time_slots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assistants" ADD CONSTRAINT "class_assistants_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_assistants" ADD CONSTRAINT "class_assistants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_enrollment_class_id_enrollment_user_id_fkey" FOREIGN KEY ("enrollment_class_id", "enrollment_user_id") REFERENCES "enrollments"("class_id", "user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_attendances" ADD CONSTRAINT "student_attendances_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_attendances" ADD CONSTRAINT "assistant_attendances_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_attendances" ADD CONSTRAINT "assistant_attendances_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "permission_requests" ADD CONSTRAINT "permission_requests_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
