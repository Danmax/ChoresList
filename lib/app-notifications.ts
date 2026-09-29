import { prisma } from "@/lib/prisma";

export type AppNotificationInput = {
  recipientParentId: string;
  type: string;
  title: string;
  body?: string | null;
  url?: string | null;
  groupId?: string | null;
  dedupeKey: string;
  scheduledFor?: Date;
};

export async function createAppNotification(input: AppNotificationInput) {
  return prisma.appNotification.upsert({
    where: { dedupeKey: input.dedupeKey },
    create: { ...input, scheduledFor: input.scheduledFor ?? new Date() },
    update: {
      title: input.title,
      body: input.body ?? null,
      url: input.url ?? null,
      scheduledFor: input.scheduledFor ?? new Date(),
    },
  });
}
