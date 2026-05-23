-- CreateTable
CREATE TABLE "WishListItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "memberId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'other',
    "emoji" TEXT NOT NULL DEFAULT '🎁',
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WishListItem_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "FamilyMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
