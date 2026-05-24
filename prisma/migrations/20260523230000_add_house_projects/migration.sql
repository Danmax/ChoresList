-- CreateTable
CREATE TABLE "HouseProject" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'other',
    "emoji" TEXT NOT NULL DEFAULT '🔧',
    "rewardTitle" TEXT NOT NULL,
    "rewardEmoji" TEXT NOT NULL DEFAULT '🎫',
    "pointsBonus" INTEGER NOT NULL DEFAULT 50,
    "assignedTo" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'open',
    "dueDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseProject_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "FamilyMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RewardTicket" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "projectId" INTEGER NOT NULL,
    "memberId" INTEGER NOT NULL,
    "rewardTitle" TEXT NOT NULL,
    "rewardEmoji" TEXT NOT NULL DEFAULT '🎫',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "earnedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "redeemedAt" DATETIME,
    CONSTRAINT "RewardTicket_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "HouseProject" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RewardTicket_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
