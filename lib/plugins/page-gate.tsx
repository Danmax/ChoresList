import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isPluginAccessible, type PluginKey } from "@/lib/plugins/registry";
import { parentSession, verifySessionToken } from "@/lib/session";

export async function PluginPageGate({ pluginKey, children }: { pluginKey: PluginKey; children: React.ReactNode }) {
  const session = verifySessionToken((await cookies()).get(parentSession.name)?.value);
  if (!session) redirect("/parent");
  if (!(await isPluginAccessible(session.householdId, session.parentId, pluginKey))) {
    redirect(`/parent/settings?plugin=${encodeURIComponent(pluginKey)}`);
  }
  return children;
}
