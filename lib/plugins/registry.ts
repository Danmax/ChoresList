import { ForbiddenError } from "@/lib/auth-error";
import { prisma } from "@/lib/prisma";

export type PluginKey = "family-tree" | "education-academy";
export type PluginStatus = "active" | "inactive";

export type PluginDefinition = {
  key: PluginKey;
  label: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  bg: string;
  roles: string[];
  defaultStatus: PluginStatus;
};

export const PLUGIN_REGISTRY: PluginDefinition[] = [
  {
    key: "family-tree",
    label: "Family Tree",
    description: "Build a visual family diagram with relatives, guardians, partners, and branches.",
    icon: "Network",
    route: "/parent/family-tree",
    color: "#14b8a6",
    bg: "#ccfbf1",
    roles: ["owner", "parent", "grandparent"],
    defaultStatus: "inactive",
  },
  {
    key: "education-academy",
    label: "Merit Education Academy",
    description: "Assign daily learning drills, flashcards, trivia, exams, real-life exercises, and projects.",
    icon: "GraduationCap",
    route: "/parent/academy",
    color: "#2563eb",
    bg: "#dbeafe",
    roles: ["owner", "parent", "grandparent"],
    defaultStatus: "inactive",
  },
];

export function pluginByKey(key: unknown) {
  return typeof key === "string" ? PLUGIN_REGISTRY.find((plugin) => plugin.key === key) ?? null : null;
}

export async function pluginsForHousehold(householdId: number) {
  const states = await prisma.householdPlugin.findMany({ where: { householdId } });
  const stateByKey = new Map(states.map((state) => [state.pluginKey, state]));

  return PLUGIN_REGISTRY.map((plugin) => {
    const state = stateByKey.get(plugin.key);
    const status = state?.status === "active" ? "active" : plugin.defaultStatus;

    return {
      ...plugin,
      status,
      active: status === "active",
      settings: state?.settings ?? null,
      activatedAt: state?.activatedAt ?? null,
      activatedByParentId: state?.activatedByParentId ?? null,
    };
  });
}

export async function isPluginActive(householdId: number, pluginKey: PluginKey) {
  const plugin = pluginByKey(pluginKey);
  if (!plugin) return false;
  const state = await prisma.householdPlugin.findUnique({
    where: { householdId_pluginKey: { householdId, pluginKey } },
    select: { status: true },
  });
  return (state?.status ?? plugin.defaultStatus) === "active";
}

export async function requirePluginActive(householdId: number, pluginKey: PluginKey) {
  if (!(await isPluginActive(householdId, pluginKey))) {
    throw new ForbiddenError("Activate this plugin before using it");
  }
}
