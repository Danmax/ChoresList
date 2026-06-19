import { NextRequest, NextResponse } from "next/server";
import { requireOwnerSession, withErrors } from "@/lib/api";
import { syncAllFamilyEventsToGoogle } from "@/lib/google-calendar";
import { requirePluginAccess } from "@/lib/plugins/registry";

export const POST = withErrors(async (req: NextRequest) => {
  const { householdId, parentId } = await requireOwnerSession(req);
  await requirePluginAccess(householdId, parentId, "calendar-sync");

  const result = await syncAllFamilyEventsToGoogle(householdId);
  if (result.skipped) {
    return NextResponse.json({ error: result.skipped }, { status: 409 });
  }

  if (result.failed > 0) {
    return NextResponse.json(
      { ...result, error: `${result.failed} family event${result.failed === 1 ? "" : "s"} failed to sync` },
      { status: 502 }
    );
  }

  return NextResponse.json(result);
});
