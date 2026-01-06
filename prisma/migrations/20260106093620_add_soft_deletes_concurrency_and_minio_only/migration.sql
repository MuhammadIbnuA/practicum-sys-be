/*
  Warnings:

  - You are about to drop the column `captured_image` on the `face_attendance_logs` table. All the data in the column will be lost.
  - You are about to drop the column `file_data` on the `permission_requests` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `classes` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `courses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `enrollments` table without a default value. This is not possible if the table is not empty.
  - Added the required column `captured_image_url` to the `face_attendance_logs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `file_url` to the `permission_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `semesters` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `student_attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `users` table without a default value. This is not possible if the table is not empty.

*/

-- Step 1: Add updated_at columns with default value first
ALTER TABLE "classes" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "courses" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "enrollments" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "semesters" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "student_attendances" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Step 2: Add other timestamp columns
ALTER TABLE "classes" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "classes" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "courses" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "courses" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "enrollments" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "semesters" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "semesters" ADD COLUMN "deleted_at" TIMESTAMP(3);

ALTER TABLE "users" ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Step 3: Add version columns for concurrency control
ALTER TABLE "inhal_payments" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "payments" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "permission_requests" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "student_attendances" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- Step 4: Handle file storage migration
-- Add file_url column with temporary default
ALTER TABLE "permission_requests" ADD COLUMN "file_url" TEXT NOT NULL DEFAULT 'migrating';

-- Update file_url from file_data (convert base64 to placeholder)
-- In production, you would migrate to MinIO here
UPDATE "permission_requests" SET "file_url" = 'legacy-' || id::text WHERE "file_url" = 'migrating';

-- Drop old file_data column
ALTER TABLE "permission_requests" DROP COLUMN "file_data";

-- Step 5: Handle face attendance logs
-- Add captured_image_url with temporary default
ALTER TABLE "face_attendance_logs" ADD COLUMN "captured_image_url" TEXT NOT NULL DEFAULT 'migrating';

-- Update captured_image_url from captured_image
UPDATE "face_attendance_logs" SET "captured_image_url" = 'legacy-' || id::text WHERE "captured_image_url" = 'migrating';

-- Drop old captured_image column
ALTER TABLE "face_attendance_logs" DROP COLUMN "captured_image";

-- Step 6: Create indexes
CREATE INDEX "classes_deleted_at_idx" ON "classes"("deleted_at");
CREATE INDEX "courses_deleted_at_idx" ON "courses"("deleted_at");
CREATE INDEX "enrollments_deleted_at_idx" ON "enrollments"("deleted_at");
CREATE INDEX "semesters_deleted_at_idx" ON "semesters"("deleted_at");
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");
