-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "theory_class" TEXT;

-- CreateIndex
CREATE INDEX "payments_theory_class_idx" ON "payments"("theory_class");
