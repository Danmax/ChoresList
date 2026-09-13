import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getPublicWishList = cache(async (token: string) => {
  if (!/^[a-f0-9]{48}$/.test(token)) return null;
  return prisma.giftList.findFirst({
    where: { publicToken: token, publicSharedAt: { not: null } },
    select: {
      title: true,
      type: true,
      eventYear: true,
      member: { select: { name: true, avatar: true, color: true } },
      items: {
        where: { status: "pending" },
        select: { id: true, title: true, category: true, emoji: true, note: true, amazonUrl: true, imageUrl: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
});
