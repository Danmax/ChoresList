"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart2,
  CalendarDays,
  CheckCircle2,
  ChefHat,
  DollarSign,
  Gift,
  Gamepad2,
  GraduationCap,
  HeartHandshake,
  Home,
  ListChecks,
  LogOut,
  Menu,
  MonitorSmartphone,
  Network,
  Settings,
  ShoppingCart,
  Ticket,
  Users,
  Wrench,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AccountRole = "owner" | "parent" | "grandparent";

export type ParentShellPlugin = {
  key: string;
  label: string;
  description: string;
  route: string;
  color?: string;
  bg?: string;
  active: boolean;
  roles: string[];
  showInNavigation?: boolean;
};

type ParentShellProps = {
  children: React.ReactNode;
  accountRole?: AccountRole;
  plugins?: ParentShellPlugin[];
  onSignOut?: () => void;
};

const BASE_NAV = [
  { href: "/parent", icon: Home, label: "Overview", roles: ["owner", "parent", "grandparent"] },
  { href: "/parent/members", icon: Users, label: "Family", roles: ["owner", "parent"] },
  { href: "/parent/chores", icon: ListChecks, label: "Chores", roles: ["owner", "parent"] },
  { href: "/parent/assign", icon: CalendarDays, label: "Assignments", roles: ["owner", "parent", "grandparent"] },
  { href: "/parent/tasks", icon: CheckCircle2, label: "Parent Tasks", roles: ["owner", "parent"] },
  { href: "/parent/games", icon: Gamepad2, label: "Games", roles: ["owner", "parent", "grandparent"] },
  { href: "/parent/allowance", icon: DollarSign, label: "Allowance", roles: ["owner", "parent"] },
  { href: "/parent/projects", icon: Wrench, label: "Projects", roles: ["owner", "parent", "grandparent"] },
  { href: "/parent/tickets", icon: Ticket, label: "Tickets", roles: ["owner", "parent", "grandparent"] },
  { href: "/parent/devices", icon: MonitorSmartphone, label: "Devices", roles: ["owner", "parent"] },
  { href: "/parent/wishlist", icon: Gift, label: "Wish Lists", roles: ["owner", "parent", "grandparent"] },
  { href: "/parent/settings", icon: Settings, label: "Settings", roles: ["owner", "parent", "grandparent"] },
];

function pluginIcon(key: string) {
  if (key === "education-academy") return GraduationCap;
  if (key === "recipes") return ChefHat;
  if (key === "family-tree") return Network;
  if (key === "grocery-pantry") return ShoppingCart;
  if (key === "community-events") return Users;
  if (key === "reports-coaching") return BarChart2;
  if (key === "emotional-wellbeing") return HeartHandshake;
  return CalendarDays;
}

function roleLabel(role: AccountRole) {
  if (role === "owner") return "Owner";
  if (role === "grandparent") return "Grandparent";
  return "Parent";
}

export function ParentManagementShell({ children, accountRole, plugins, onSignOut }: ParentShellProps) {
  const pathname = usePathname() ?? "/parent";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<AccountRole>(accountRole ?? "parent");
  const [resolvedPlugins, setResolvedPlugins] = useState<ParentShellPlugin[]>(plugins ?? []);

  useEffect(() => {
    if (accountRole) {
      setResolvedRole(accountRole);
      return;
    }
    fetch("/api/parent/auth")
      .then((res) => res.json())
      .then((data) => {
        if (data?.accountRole === "owner" || data?.accountRole === "parent" || data?.accountRole === "grandparent") {
          setResolvedRole(data.accountRole);
        }
      })
      .catch(() => setResolvedRole("parent"));
  }, [accountRole]);

  useEffect(() => {
    if (plugins) {
      setResolvedPlugins(plugins);
      return;
    }
    fetch("/api/plugins")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setResolvedPlugins(Array.isArray(data?.plugins) ? data.plugins : []))
      .catch(() => setResolvedPlugins([]));
  }, [plugins]);

  const navItems = useMemo(() => {
    const pluginItems = resolvedPlugins
      .filter((plugin) => plugin.active && plugin.showInNavigation !== false)
      .map((plugin) => ({
        href: plugin.route,
        icon: pluginIcon(plugin.key),
        label: plugin.label,
        roles: plugin.roles,
      }));

    const seen = new Set<string>();
    return [...BASE_NAV, ...pluginItems]
      .filter((item) => item.roles.includes(resolvedRole))
      .filter((item) => {
        if (seen.has(item.href)) return false;
        seen.add(item.href);
        return true;
      });
  }, [resolvedPlugins, resolvedRole]);

  async function signOut() {
    if (onSignOut) {
      onSignOut();
      return;
    }
    await fetch("/api/parent/auth", { method: "DELETE" }).catch(() => null);
    window.location.assign("/parent");
  }

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {navItems.map((item) => {
        const active = pathname === item.href || (item.href !== "/parent" && pathname.startsWith(`${item.href}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950",
              active && "bg-slate-900 text-white hover:bg-slate-900 hover:text-white"
            )}
          >
            <item.icon size={18} />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="lg:grid lg:min-h-screen lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="border-b border-slate-200 px-5 py-4">
            <Link href="/parent" className="block text-lg font-black text-slate-950">
              ChoresList
            </Link>
            <p className="mt-1 text-xs font-black uppercase tracking-wide text-slate-400">{roleLabel(resolvedRole)} workspace</p>
          </div>
          {nav}
          <div className="border-t border-slate-200 p-3">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
              <Home size={18} /> Family dashboard
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
            >
              <LogOut size={18} /> Sign out
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
            <Link href="/parent" className="font-black text-slate-950">ChoresList</Link>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
              aria-label="Open parent navigation"
            >
              <Menu size={20} />
            </button>
          </header>

          {mobileOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <button
                type="button"
                className="absolute inset-0 bg-slate-950/30"
                aria-label="Close parent navigation"
                onClick={() => setMobileOpen(false)}
              />
              <aside className="relative flex h-full w-80 max-w-[86vw] flex-col bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                  <div>
                    <p className="font-black text-slate-950">ChoresList</p>
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">{roleLabel(resolvedRole)} workspace</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="inline-flex size-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700"
                    aria-label="Close parent navigation"
                  >
                    <X size={18} />
                  </button>
                </div>
                {nav}
                <div className="border-t border-slate-200 p-3">
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-100">
                    <Home size={18} /> Family dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={signOut}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} /> Sign out
                  </button>
                </div>
              </aside>
            </div>
          )}

          <main className="mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export function ParentPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-black tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2 sm:justify-end">{actions}</div>}
    </div>
  );
}
