-- CreateTable
CREATE TABLE "FamilyMember" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "age" INTEGER NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'child',
    "avatar" TEXT NOT NULL DEFAULT '🧒',
    "color" TEXT NOT NULL DEFAULT '#a78bfa',
    "totalPoints" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Chore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT NOT NULL DEFAULT '✅',
    "color" TEXT NOT NULL DEFAULT '#e0e7ff',
    "ageMin" INTEGER NOT NULL DEFAULT 3,
    "ageMax" INTEGER NOT NULL DEFAULT 18,
    "pointsValue" INTEGER NOT NULL DEFAULT 10,
    "category" TEXT NOT NULL DEFAULT 'other',
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "ChoreAssignment" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memberId" INTEGER NOT NULL,
    "choreId" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "dueDate" DATETIME,
    "dayOfWeek" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChoreAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChoreAssignment_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskCompletion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "assignmentId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "completedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "photoBeforePath" TEXT,
    "photoAfterPath" TEXT,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "verifiedByParent" BOOLEAN NOT NULL DEFAULT false,
    "weekStartDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TaskCompletion_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ChoreAssignment" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskCompletion_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SkillCategory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "icon" TEXT NOT NULL DEFAULT '⭐'
);

-- CreateTable
CREATE TABLE "ChoreSkill" (
    "choreId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,

    PRIMARY KEY ("choreId", "skillId"),
    CONSTRAINT "ChoreSkill_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ChoreSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MemberSkill" (
    "memberId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,

    PRIMARY KEY ("memberId", "skillId"),
    CONSTRAINT "MemberSkill_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "SkillCategory" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WeeklyAllowance" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memberId" INTEGER NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "pointsEarned" INTEGER NOT NULL DEFAULT 0,
    "amountEarned" REAL NOT NULL DEFAULT 0,
    "paidOut" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "WeeklyAllowance_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AllowanceSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memberId" INTEGER NOT NULL,
    "weeklyBaseRate" REAL NOT NULL DEFAULT 0,
    "pointsToDollar" REAL NOT NULL DEFAULT 0.10,
    CONSTRAINT "AllowanceSettings_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChoreInstructions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "choreId" INTEGER NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',
    "tips" TEXT NOT NULL DEFAULT '[]',
    "safetyNotes" TEXT NOT NULL DEFAULT '[]',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ChoreInstructions_choreId_fkey" FOREIGN KEY ("choreId") REFERENCES "Chore" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FamilyEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "eventType" TEXT NOT NULL DEFAULT 'other',
    "date" DATETIME NOT NULL,
    "endDate" DATETIME,
    "allDay" BOOLEAN NOT NULL DEFAULT true,
    "recurring" TEXT NOT NULL DEFAULT 'none',
    "notes" TEXT,
    "color" TEXT NOT NULL DEFAULT '#fbbf24',
    "icon" TEXT NOT NULL DEFAULT '📅',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "AllowanceSettings_memberId_key" ON "AllowanceSettings"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoreInstructions_choreId_key" ON "ChoreInstructions"("choreId");
