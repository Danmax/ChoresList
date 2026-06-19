import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireOwnerSession, requireSession, withErrors } from "@/lib/api";
import { pluginByKey, pluginStatusConflict, pluginsForHousehold } from "@/lib/plugins/registry";

function cleanStatus(value: unknown) {
  return value === "active" ? "active" : value === "inactive" ? "inactive" : null;
}

export const GET = withErrors(async (req: NextRequest) => {
  const { householdId } = requireSession(req);
  const plugins = await pluginsForHousehold(householdId);
  return NextResponse.json({ plugins });
});

export const PUT = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireOwnerSession(req);
  const body = await req.json();
  const plugin = pluginByKey(body.pluginKey);
  const status = cleanStatus(body.status);

  if (!plugin || !status) {
    return NextResponse.json({ error: "Valid pluginKey and status are required" }, { status: 400 });
  }

  let settings: Record<string, unknown> | undefined;
  if (body.settings !== undefined) {
    if (!body.settings || typeof body.settings !== "object" || Array.isArray(body.settings)) {
      return NextResponse.json({ error: "Plugin settings must be an object" }, { status: 400 });
    }
    const serialized = JSON.stringify(body.settings);
    if (serialized.length > 8192) {
      return NextResponse.json({ error: "Plugin settings are too large" }, { status: 413 });
    }
    settings = JSON.parse(serialized) as Record<string, unknown>;
  }

  const currentPlugins = await pluginsForHousehold(householdId);
  const conflict = pluginStatusConflict(currentPlugins, plugin, status);
  if (conflict) {
    return NextResponse.json({ error: conflict }, { status: 409 });
  }

  await prisma.householdPlugin.upsert({
    where: { householdId_pluginKey: { householdId, pluginKey: plugin.key } },
    create: {
      householdId,
      pluginKey: plugin.key,
      status,
      settings: settings as Prisma.InputJsonValue | undefined,
      activatedAt: status === "active" ? new Date() : null,
      activatedByParentId: status === "active" ? parentId : null,
    },
    update: {
      status,
      settings: settings as Prisma.InputJsonValue | undefined,
      activatedAt: status === "active" ? new Date() : null,
      activatedByParentId: status === "active" ? parentId : null,
    },
  });

  if (["notifications", "community-events"].includes(plugin.key) && status === "inactive") {
    const parents = await prisma.parentAccount.findMany({ where: { householdId }, select: { id: true } });
    await prisma.emailNotification.updateMany({
      where: {
        recipientParentId: { in: parents.map((parent) => parent.id) },
        status: { in: ["pending", "failed"] },
        ...(plugin.key === "community-events" ? { groupId: { not: null } } : {}),
      },
      data: { status: "cancelled" },
    });
  }

  const plugins = await pluginsForHousehold(householdId);
  return NextResponse.json({ plugins });
});
