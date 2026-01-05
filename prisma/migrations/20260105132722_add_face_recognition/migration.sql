-- CreateTable
CREATE TABLE "face_data" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "face_descriptors" JSONB NOT NULL,
    "sample_images" JSONB NOT NULL,
    "sample_count" INTEGER NOT NULL DEFAULT 0,
    "is_trained" BOOLEAN NOT NULL DEFAULT false,
    "trained_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "face_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "face_attendance_logs" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "captured_image" TEXT NOT NULL,
    "device_info" TEXT,
    "recognized_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "face_attendance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "face_data_user_id_key" ON "face_data"("user_id");

-- CreateIndex
CREATE INDEX "face_data_user_id_idx" ON "face_data"("user_id");

-- CreateIndex
CREATE INDEX "face_data_is_trained_idx" ON "face_data"("is_trained");

-- CreateIndex
CREATE INDEX "face_attendance_logs_student_id_idx" ON "face_attendance_logs"("student_id");

-- CreateIndex
CREATE INDEX "face_attendance_logs_session_id_idx" ON "face_attendance_logs"("session_id");

-- CreateIndex
CREATE INDEX "face_attendance_logs_created_at_idx" ON "face_attendance_logs"("created_at");

-- AddForeignKey
ALTER TABLE "face_data" ADD CONSTRAINT "face_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_attendance_logs" ADD CONSTRAINT "face_attendance_logs_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "face_attendance_logs" ADD CONSTRAINT "face_attendance_logs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
