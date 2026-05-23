-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAllowance_memberId_weekStart_key" ON "WeeklyAllowance"("memberId", "weekStart");
