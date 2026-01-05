-- AlterTable
ALTER TABLE "enrollments" ADD COLUMN     "theory_class" TEXT;

-- CreateIndex
CREATE INDEX "enrollments_theory_class_idx" ON "enrollments"("theory_class");
