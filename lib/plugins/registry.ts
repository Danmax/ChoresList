import { ForbiddenError } from "@/lib/auth-error";
import { prisma } from "@/lib/prisma";

export type PluginKey =
  | "family-tree"
  | "education-academy"
  | "recipes"
  | "grocery-pantry"
  | "community-events"
  | "reports-coaching"
  | "family-calendar"
  | "calendar-sync"
  | "notifications"
  | "emotional-wellbeing";
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
  category: "family" | "planning" | "community" | "learning" | "insights" | "integration";
  dependencies: PluginKey[];
  capabilities: string[];
  backgroundJobs: string[];
  dataRetention: "preserve-on-deactivate";
  settingsSchemaVersion: number;
  showInNavigation?: boolean;
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
    category: "family", dependencies: [], capabilities: ["family-tree"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
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
    category: "learning", dependencies: [], capabilities: ["skills", "badges", "learning-assignments"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
  {
    key: "recipes",
    label: "Recipes",
    description: "Save dishes, prep instructions, dish photos, shopping lists, potluck items, and shared public recipes.",
    icon: "ChefHat",
    route: "/parent/recipes",
    color: "#dc2626",
    bg: "#fee2e2",
    roles: ["owner", "parent", "grandparent"],
    defaultStatus: "inactive",
    category: "planning", dependencies: [], capabilities: ["recipes", "recipe-shopping-export"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
  {
    key: "grocery-pantry", label: "Grocery & Pantry",
    description: "Recurring shopping lists, item details, receipts, and on-hand pantry tracking.",
    icon: "ShoppingCart", route: "/parent/groceries", color: "#22c55e", bg: "#dcfce7",
    roles: ["owner", "parent"], defaultStatus: "active", category: "planning", dependencies: [],
    capabilities: ["grocery-lists", "pantry", "receipt-upload"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
  {
    key: "community-events", label: "Community Events",
    description: "Community groups, calendars, recurring events, RSVP, potlucks, classes, and meeting links.",
    icon: "Users", route: "/community", color: "#8b5cf6", bg: "#ede9fe",
    roles: ["owner", "parent", "grandparent"], defaultStatus: "active", category: "community", dependencies: [],
    capabilities: ["community-groups", "community-events", "rsvp", "potluck", "community-classes"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
  {
    key: "reports-coaching", label: "Reports & Coaching",
    description: "Chore completion trends, feedback, points, and family progress reports.",
    icon: "BarChart2", route: "/parent/reports", color: "#10b981", bg: "#d1fae5",
    roles: ["owner", "parent", "grandparent"], defaultStatus: "active", category: "insights", dependencies: [],
    capabilities: ["chore-reports", "completion-feedback"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
  {
    key: "family-calendar", label: "Family Calendar",
    description: "Family events, appointments, activities, recurrence, and calendar views.",
    icon: "CalendarDays", route: "/calendar", color: "#f97316", bg: "#ffedd5",
    roles: ["owner", "parent", "grandparent"], defaultStatus: "active", category: "planning", dependencies: [],
    capabilities: ["family-events", "recurrence"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
  {
    key: "calendar-sync", label: "Calendar Sync",
    description: "Connect Google Calendar and synchronize family events and chore assignments.",
    icon: "RefreshCw", route: "/parent/settings", color: "#4285f4", bg: "#dbeafe",
    roles: ["owner"], defaultStatus: "active", category: "integration", dependencies: ["family-calendar"],
    capabilities: ["google-calendar-sync"], backgroundJobs: ["calendar-sync"],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1, showInNavigation: false,
  },
  {
    key: "notifications", label: "Notifications & Digests",
    description: "Email assignments, event reminders, confirmations, and manager summaries.",
    icon: "Mail", route: "/parent/settings", color: "#3b82f6", bg: "#dbeafe",
    roles: ["owner", "parent", "grandparent"], defaultStatus: "active", category: "integration", dependencies: [],
    capabilities: ["email-notifications", "scheduled-reminders"], backgroundJobs: ["notification-processor"],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1, showInNavigation: false,
  },
  {
    key: "emotional-wellbeing", label: "Emotional Wellbeing",
    description: "Private, supportive family check-ins without public scores, rankings, or shame-based feedback.",
    icon: "HeartHandshake", route: "/parent/wellbeing", color: "#ec4899", bg: "#fce7f3",
    roles: ["owner", "parent", "grandparent"], defaultStatus: "inactive", category: "family", dependencies: [],
    capabilities: ["private-wellbeing-check-ins"], backgroundJobs: [],
    dataRetention: "preserve-on-deactivate", settingsSchemaVersion: 1,
  },
];

export function pluginByKey(key: unknown) {
  return typeof key === "string" ? PLUGIN_REGISTRY.find((plugin) => plugin.key === key) ?? null : null;
}

export function validatePluginRegistry() {
  const errors: string[] = [];
  const keys = new Set<PluginKey>();
  for (const plugin of PLUGIN_REGISTRY) {
    if (keys.has(plugin.key)) errors.push(`Duplicate plugin key: ${plugin.key}`);
    keys.add(plugin.key);
  }
  for (const plugin of PLUGIN_REGISTRY) {
    for (const dependency of plugin.dependencies) {
      const definition = pluginByKey(dependency);
      if (!definition) errors.push(`${plugin.key} has missing dependency: ${dependency}`);
      if (dependency === plugin.key) errors.push(`${plugin.key} depends on itself`);
      if (plugin.defaultStatus === "active" && definition?.defaultStatus !== "active") {
        errors.push(`${plugin.key} is active by default but dependency ${dependency} is not`);
      }
    }
  }
  const visiting = new Set<PluginKey>();
  const visited = new Set<PluginKey>();
  function visit(key: PluginKey) {
    if (visiting.has(key)) {
      errors.push(`Plugin dependency cycle includes: ${key}`);
      return;
    }
    if (visited.has(key)) return;
    visiting.add(key);
    for (const dependency of pluginByKey(key)?.dependencies ?? []) visit(dependency);
    visiting.delete(key);
    visited.add(key);
  }
  for (const plugin of PLUGIN_REGISTRY) visit(plugin.key);
  return errors;
}

export function pluginStatusConflict(
  currentPlugins: Array<Pick<PluginDefinition, "key" | "label" | "dependencies"> & { active: boolean }>,
  plugin: PluginDefinition,
  status: PluginStatus
) {
  if (status === "active") {
    const missing = plugin.dependencies.filter((key) => !currentPlugins.find((item) => item.key === key)?.active);
    return missing.length ? `Activate required plugin${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}` : null;
  }
  const dependents = currentPlugins.filter((item) => item.active && item.dependencies.includes(plugin.key));
  return dependents.length
    ? `Deactivate dependent plugin${dependents.length === 1 ? "" : "s"} first: ${dependents.map((item) => item.label).join(", ")}`
    : null;
}

export async function pluginsForHousehold(householdId: string) {
  const states = await prisma.householdPlugin.findMany({ where: { householdId } });
  const stateByKey = new Map(states.map((state) => [state.pluginKey, state]));

  return PLUGIN_REGISTRY.map((plugin) => {
    const state = stateByKey.get(plugin.key);
    const status = state?.status === "active" || state?.status === "inactive" ? state.status : plugin.defaultStatus;

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

export async function isPluginActive(householdId: string, pluginKey: PluginKey) {
  const plugin = pluginByKey(pluginKey);
  if (!plugin) return false;
  const state = await prisma.householdPlugin.findUnique({
    where: { householdId_pluginKey: { householdId, pluginKey } },
    select: { status: true },
  });
  return (state?.status ?? plugin.defaultStatus) === "active";
}

export async function requirePluginActive(householdId: string, pluginKey: PluginKey) {
  if (!(await isPluginActive(householdId, pluginKey))) {
    throw new ForbiddenError("Activate this plugin before using it");
  }
}

export async function isPluginAccessible(householdId: string, parentId: string, pluginKey: PluginKey) {
  const plugin = pluginByKey(pluginKey);
  if (!plugin || !(await isPluginActive(householdId, pluginKey))) return false;
  const parent = await prisma.parentAccount.findFirst({
    where: { id: parentId, householdId },
    select: { accountRole: true },
  });
  return Boolean(parent && plugin.roles.includes(parent.accountRole));
}

export async function requirePluginAccess(householdId: string, parentId: string, pluginKey: PluginKey) {
  if (!(await isPluginAccessible(householdId, parentId, pluginKey))) {
    throw new ForbiddenError("This plugin is inactive or unavailable for your household role");
  }
}
