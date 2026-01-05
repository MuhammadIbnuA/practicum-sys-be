-- AlterEnum
ALTER TYPE "AttendanceStatus" ADD VALUE 'INHAL';

-- CreateTable
CREATE TABLE "inhal_payments" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "session_id" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 30000,
    "proof_file_name" TEXT NOT NULL,
    "proof_file_url" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "verified_by_id" INTEGER,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inhal_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inhal_payments_student_id_idx" ON "inhal_payments"("student_id");

-- CreateIndex
CREATE INDEX "inhal_payments_session_id_idx" ON "inhal_payments"("session_id");

-- CreateIndex
CREATE INDEX "inhal_payments_status_idx" ON "inhal_payments"("status");

-- CreateIndex
CREATE INDEX "inhal_payments_created_at_idx" ON "inhal_payments"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "inhal_payments_student_id_session_id_key" ON "inhal_payments"("student_id", "session_id");

-- AddForeignKey
ALTER TABLE "inhal_payments" ADD CONSTRAINT "inhal_payments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inhal_payments" ADD CONSTRAINT "inhal_payments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "class_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inhal_payments" ADD CONSTRAINT "inhal_payments_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
