import "dotenv/config";
import { prisma } from "../lib/prisma";
import { deliverNotification, enqueueWeeklyManagerSummaries, notificationIsEnabled, syncUpcomingOneTimeEventReminders } from "../lib/community-notifications";

async function run() {
  const now = new Date();
  await prisma.emailNotification.updateMany({
    where: { status: "processing", lockedAt: { lt: new Date(now.getTime() - 10 * 60_000) } },
    data: { status: "pending", lockedAt: null },
  });
  await syncUpcomingOneTimeEventReminders(now);
  await enqueueWeeklyManagerSummaries(now);
  const due = await prisma.emailNotification.findMany({
    where: { status: { in: ["pending", "failed"] }, scheduledFor: { lte: now }, attempts: { lt: 5 } },
    orderBy: { scheduledFor: "asc" }, take: 50,
  });
  for (const notification of due) {
    const claimed = await prisma.emailNotification.updateMany({
      where: { id: notification.id, status: { in: ["pending", "failed"] } },
      data: { status: "processing", lockedAt: new Date(), attempts: { increment: 1 } },
    });
    if (!claimed.count) continue;
    try {
      if (!(await notificationIsEnabled(notification))) {
        await prisma.emailNotification.update({
          where: { id: notification.id },
          data: { status: "cancelled", lockedAt: null, lastError: null },
        });
        continue;
      }
      const result = await deliverNotification(notification);
      if (!result.sent) throw new Error(result.reason);
      await prisma.emailNotification.update({ where: { id: notification.id }, data: { status: "sent", sentAt: new Date(), lockedAt: null, lastError: null } });
    } catch (error) {
      const attempts = notification.attempts + 1;
      await prisma.emailNotification.update({
        where: { id: notification.id },
        data: { status: attempts >= 5 ? "failed-permanent" : "failed", lockedAt: null, lastError: String(error).slice(0, 2000), scheduledFor: new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000) },
      });
    }
  }
}

run().finally(() => prisma.$disconnect());
