-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'child',
    "avatar" TEXT NOT NULL DEFAULT '🧒',
    "color" TEXT NOT NULL DEFAULT '#a78bfa',
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '✅',
    "color" TEXT NOT NULL DEFAULT '#e0e7ff',
    "ageMin" INTEGER NOT NULL DEFAULT 3,
    "ageMax" INTEGER NOT NULL DEFAULT 18,
    "pointsValue" INTEGER NOT NULL DEFAULT 10,
    "category" TEXT NOT NULL DEFAULT 'other',
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Chore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreAssignment" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "choreId" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "dueDate" TIMESTAMP(3),
    "dayOfWeek" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" SERIAL NOT NULL,
    "assignmentId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoBeforePath" TEXT,
    "photoAfterPath" TEXT,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "verifiedByParent" BOOLEAN NOT NULL DEFAULT false,
    "weekStartDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '⭐',

    CONSTRAINT "SkillCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreSkill" (
    "choreId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    CONSTRAINT "ChoreSkill_pkey" PRIMARY KEY ("choreId","skillId")
);

-- CreateTable
CREATE TABLE "MemberSkill" (
    "memberId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MemberSkill_pkey" PRIMARY KEY ("memberId","skillId")
);

-- CreateTable
CREATE TABLE "WeeklyAllowance" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "amountEarned" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paidOut" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WeeklyAllowance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AllowanceSettings" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "weeklyBaseRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pointsToDollar" DOUBLE PRECISION NOT NULL DEFAULT 0.10,

    CONSTRAINT "AllowanceSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoreInstructions" (
    "id" SERIAL NOT NULL,
    "choreId" INTEGER NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "tips" TEXT NOT NULL DEFAULT '[]',
    "safetyNotes" TEXT NOT NULL DEFAULT '[]',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChoreInstructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishListItem" (
    "id" SERIAL NOT NULL,
    "memberId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "emoji" TEXT NOT NULL DEFAULT '🎁',
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishListItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseProject" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "emoji" TEXT NOT NULL DEFAULT '🔧',
    "rewardTitle" TEXT NOT NULL,
    "rewardEmoji" TEXT NOT NULL DEFAULT '🎫',
    "pointsBonus" INTEGER NOT NULL DEFAULT 50,
    "assignedTo" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTicket" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "rewardTitle" TEXT NOT NULL,
    "rewardEmoji" TEXT NOT NULL DEFAULT '🎫',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" TIMESTAMP(3),

    CONSTRAINT "RewardTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FamilyEvent" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'other',
    "date" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "recurring" TEXT NOT NULL DEFAULT 'none',
    "notes" TEXT,
    "color" TEXT NOT NULL DEFAULT '#fbbf24',
    "icon" TEXT NOT NULL DEFAULT '📅',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FamilyEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyAllowance_memberId_weekStart_key" ON "WeeklyAllowance"("memberId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "AllowanceSettings_memberId_key" ON "AllowanceSettings"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreInstructions_choreId_key" ON "ChoreInstructions"("choreId");

-- AddForeignKey
ALTER TABLE "ChoreAssignment" ADD CONSTRAINT "ChoreAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreAssignment" ADD CONSTRAINT "ChoreAssignment_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ChoreAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskCompletion" ADD CONSTRAINT "TaskCompletion_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreSkill" ADD CONSTRAINT "ChoreSkill_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreSkill" ADD CONSTRAINT "ChoreSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberSkill" ADD CONSTRAINT "MemberSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyAllowance" ADD CONSTRAINT "WeeklyAllowance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AllowanceSettings" ADD CONSTRAINT "AllowanceSettings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoreInstructions" ADD CONSTRAINT "ChoreInstructions_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishListItem" ADD CONSTRAINT "WishListItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseProject" ADD CONSTRAINT "HouseProject_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "FamilyMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTicket" ADD CONSTRAINT "RewardTicket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HouseProject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTicket" ADD CONSTRAINT "RewardTicket_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
