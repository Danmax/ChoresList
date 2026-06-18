import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, withErrors } from "@/lib/api";

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const skills = await prisma.skillCategory.findMany({
    where: { householdId },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(skills);
});
