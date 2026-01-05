/*
  Warnings:

  - You are about to drop the column `recognized_name` on the `face_attendance_logs` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "face_attendance_logs" DROP COLUMN "recognized_name",
ADD COLUMN     "recognized_by_id" INTEGER;

-- AddForeignKey
ALTER TABLE "face_attendance_logs" ADD CONSTRAINT "face_attendance_logs_recognized_by_id_fkey" FOREIGN KEY ("recognized_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
