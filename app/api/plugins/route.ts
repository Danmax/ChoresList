import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireParentSession, requireSession, withErrors } from "@/lib/api";
import { pluginByKey, pluginsForHousehold } from "@/lib/plugins/registry";

function cleanStatus(value: unknown) {
  return value === "active" ? "active" : value === "inactive" ? "inactive" : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const plugins = await pluginsForHousehold(householdId);
  return NextResponse.json({ plugins });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireParentSession(req);
  const body = await req.json();
  const plugin = pluginByKey(body.pluginKey);
  const status = cleanStatus(body.status);

  if (!plugin || !status) {
    return NextResponse.json({ error: "Valid pluginKey and status are required" }, { status: 400 });
  }

  await prisma.householdPlugin.upsert({
    where: { householdId_pluginKey: { householdId, pluginKey: plugin.key } },
    create: {
      householdId,
      pluginKey: plugin.key,
      status,
      settings: typeof body.settings === "object" && body.settings !== null ? body.settings : undefined,
      activatedAt: status === "active" ? new Date() : null,
      activatedByParentId: status === "active" ? parentId : null,
    },
    update: {
      status,
      settings: typeof body.settings === "object" && body.settings !== null ? body.settings : undefined,
      activatedAt: status === "active" ? new Date() : null,
      activatedByParentId: status === "active" ? parentId : null,
    },
  });

  const plugins = await pluginsForHousehold(householdId);
  return NextResponse.json({ plugins });
});
