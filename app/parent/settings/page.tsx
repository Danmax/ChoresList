"use client";

import { type ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, CalendarDays, ExternalLink, LockKeyhole, Mail, Puzzle, RefreshCw, Save, Shield, ShieldCheck, Trash2, UserCog, Users } from "lucide-react";
import { toast } from "sonner";

const TIME_ZONES = [
  { value: "America/New_York", label: "Eastern" },
  { value: "America/Chicago", label: "Central" },
  { value: "America/Denver", label: "Mountain" },
  { value: "America/Los_Angeles", label: "Pacific" },
  { value: "America/Phoenix", label: "Arizona" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
  { value: "UTC", label: "UTC" },
];

type Settings = {
  name: string;
  timeZone: string;
  parentEmail: string;
  accountRole: string;
  canManageHousehold: boolean;
  googleCalendarEnabled: boolean;
  googleCalendarId: string;
  googleCalendarSyncAssignments: boolean;
  googleCalendarSyncEvents: boolean;
  emailNotificationsEnabled: boolean;
  emailDailySummary: boolean;
  emailWeeklyReport: boolean;
  privacyShowKidPoints: boolean;
  privacyAllowKidWishlist: boolean;
  privacyStoreCompletionPhotos: boolean;
  privacyAnalyticsOptIn: boolean;
  googleCalendarConnection?: {
    googleAccountEmail: string | null;
    calendarId: string;
    syncStatus: string | null;
    lastSyncAt: string | null;
    updatedAt: string;
  } | null;
};

type Plugin = {
  key: string;
  label: string;
  description: string;
  route: string;
  active: boolean;
  status: "active" | "inactive";
  dependencies: string[];
  backgroundJobs: string[];
  dataRetention: "preserve-on-deactivate";
};

type SettingsTab = "household" | "admin";

type ParentUser = {
  id: number;
  email: string;
  accountRole: string;
  emailVerified: boolean;
  createdAt: string;
  _count: {
    communityMemberships: number;
    createdCommunityEvents: number;
  };
};

type FamilyMember = {
  id: number;
  name: string;
  age: number;
  role: string;
  avatar: string;
  totalPoints: number;
  _count: {
    assignments: number;
    devices: number;
  };
};

type CommunityMember = {
  id: number;
  parentId: number;
  role: string;
  status: string;
  parent: {
    id: number;
    email: string;
    householdId: number;
  };
};

type CommunityGroup = {
  id: number;
  name: string;
  groupType: string;
  visibility: string;
  ownedByHousehold: boolean;
  manageableByHousehold: boolean;
  currentHouseholdMembers: CommunityMember[];
  creator: {
    id: number;
    email: string;
    householdId: number;
  };
  _count: {
    members: number;
    events: number;
  };
};

type AdminData = {
  currentParentId: number;
  household: {
    id: number;
    name: string;
    createdAt: string;
    _count: {
      parents: number;
      members: number;
      devices: number;
      groceryLists: number;
    };
  };
  parents: ParentUser[];
  familyMembers: FamilyMember[];
  communities: CommunityGroup[];
};

const DEFAULT_SETTINGS: Settings = {
  name: "",
  timeZone: "America/New_York",
  parentEmail: "",
  accountRole: "parent",
  canManageHousehold: false,
  googleCalendarEnabled: false,
  googleCalendarId: "",
  googleCalendarSyncAssignments: false,
  googleCalendarSyncEvents: true,
  emailNotificationsEnabled: true,
  emailDailySummary: false,
  emailWeeklyReport: true,
  privacyShowKidPoints: true,
  privacyAllowKidWishlist: true,
  privacyStoreCompletionPhotos: true,
  privacyAnalyticsOptIn: false,
  googleCalendarConnection: null,
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  parent: "Parent",
  grandparent: "Grandparent",
  manager: "Manager",
  member: "Member",
};

export default function ParentSettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<SettingsTab>("household");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncingCalendar, setSyncingCalendar] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinResetSending, setPinResetSending] = useState(false);
  const [pinResetUrl, setPinResetUrl] = useState("");
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [savingPlugin, setSavingPlugin] = useState("");
  const canManage = settings.canManageHousehold;
  const calendarSyncActive = plugins.some((plugin) => plugin.key === "calendar-sync" && plugin.active);
  const notificationsActive = plugins.some((plugin) => plugin.key === "notifications" && plugin.active);
  const connection = settings.googleCalendarConnection;
  const calendarStatus = connection?.syncStatus ?? "not connected";
  const lastSync = connection?.lastSyncAt
    ? new Date(connection.lastSyncAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  const load = useCallback(async () => {
    const [settingsRes, pluginsRes] = await Promise.all([
      fetch("/api/parent/settings"),
      fetch("/api/plugins"),
    ]);
    if (!settingsRes.ok) {
      toast.error("Could not load household settings");
      setLoading(false);
      return;
    }
    const data = await settingsRes.json();
    setSettings({
      ...DEFAULT_SETTINGS,
      ...data,
      googleCalendarId: data.googleCalendarId ?? "",
    });
    if (pluginsRes.ok) {
      const pluginData = await pluginsRes.json().catch(() => null);
      setPlugins(Array.isArray(pluginData?.plugins) ? pluginData.plugins : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (loading) return;
    const requestedTab = new URLSearchParams(window.location.search).get("tab");
    if (requestedTab === "admin" && canManage) setTab("admin");
    if (!canManage && tab === "admin") setTab("household");
  }, [canManage, loading, tab]);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    if (!canManage) {
      toast.error("Only the household owner can save household settings");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save settings");
        return;
      }
      setSettings((previous) => ({ ...previous, ...data, googleCalendarId: data.googleCalendarId ?? "" }));
      toast.success("Settings saved");
    } finally {
      setSaving(false);
    }
  }

  async function syncCalendar() {
    if (!canManage) return;
    setSyncingCalendar(true);
    try {
      const res = await fetch("/api/google-calendar/sync", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not sync Google Calendar");
        return;
      }
      toast.success(`Synced ${data.synced} family event${data.synced === 1 ? "" : "s"}`);
      await load();
    } finally {
      setSyncingCalendar(false);
    }
  }

  async function setPluginStatus(plugin: Plugin, active: boolean) {
    if (!canManage) {
      toast.error("Only the household owner can manage plugins");
      return;
    }
    setSavingPlugin(plugin.key);
    try {
      const res = await fetch("/api/plugins", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pluginKey: plugin.key, status: active ? "active" : "inactive" }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not update plugin");
        return;
      }
      setPlugins(Array.isArray(data?.plugins) ? data.plugins : []);
      toast.success(active ? `${plugin.label} activated` : `${plugin.label} deactivated`);
    } finally {
      setSavingPlugin("");
    }
  }

  async function deleteAccount() {
    if (!canManage) {
      toast.error("Only the household owner can delete the household");
      return;
    }
    if (deleteConfirm !== "DELETE") {
      toast.error("Type DELETE to confirm");
      return;
    }
    if (!window.confirm("Permanently delete this household account and all family data? This cannot be undone.")) return;

    setDeleting(true);
    try {
      const res = await fetch("/api/parent/settings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: deleteConfirm }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not delete account");
        setDeleting(false);
        return;
      }
      toast.success("Account deleted");
      router.replace("/parent");
    } catch {
      toast.error("Could not delete account");
      setDeleting(false);
    }
  }

  async function changePin() {
    if (pinForm.newPin.length < 4) {
      toast.error("New PIN must be at least 4 digits");
      return;
    }
    if (pinForm.newPin !== pinForm.confirmPin) {
      toast.error("New PINs do not match");
      return;
    }

    setPinSaving(true);
    try {
      const res = await fetch("/api/parent/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPin: pinForm.currentPin,
          newPin: pinForm.newPin,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not change PIN");
        return;
      }
      setPinForm({ currentPin: "", newPin: "", confirmPin: "" });
      toast.success("Parent PIN updated");
    } finally {
      setPinSaving(false);
    }
  }

  async function sendPinReset() {
    setPinResetSending(true);
    setPinResetUrl("");
    try {
      const res = await fetch("/api/parent/pin-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: settings.parentEmail }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(data?.error ?? "Could not send PIN reset email");
        return;
      }
      setPinResetUrl(typeof data?.resetUrl === "string" ? data.resetUrl : "");
      toast.success("PIN reset email sent");
    } finally {
      setPinResetSending(false);
    }
  }

  function updatePinField(key: keyof typeof pinForm, value: string) {
    setPinForm((previous) => ({ ...previous, [key]: value.replace(/\D/g, "").slice(0, 8) }));
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-xl font-black text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/parent" className="rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
            <ArrowLeft size={20} className="text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-800 sm:text-3xl">Household Settings</h1>
            <p className="text-sm font-semibold text-slate-500">
              {settings.parentEmail} · {settings.accountRole === "owner" ? "Owner" : settings.accountRole === "grandparent" ? "Grandparent" : "Parent"}
            </p>
          </div>
        </div>
        {canManage && tab === "household" && (
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex w-fit items-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
          >
            <Save size={18} /> {saving ? "Saving..." : "Save"}
          </button>
        )}
      </div>

      <div className="mb-5 grid gap-2 rounded-3xl bg-white p-2 shadow-sm sm:inline-grid sm:grid-cols-2">
        <button
          type="button"
          onClick={() => {
            setTab("household");
            window.history.replaceState({}, "", "/parent/settings");
          }}
          className={`rounded-2xl px-4 py-2.5 text-sm font-black transition-colors ${
            tab === "household" ? "bg-violet-500 text-white" : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          Household Settings
        </button>
        {canManage && (
          <button
            type="button"
            onClick={() => {
              setTab("admin");
              window.history.replaceState({}, "", "/parent/settings?tab=admin");
            }}
            className={`rounded-2xl px-4 py-2.5 text-sm font-black transition-colors ${
              tab === "admin" ? "bg-slate-800 text-white" : "text-slate-500 hover:bg-slate-50"
            }`}
          >
            Admin Config
          </button>
        )}
      </div>

      {tab === "household" || !canManage ? <div className="space-y-5">
        {!canManage && (
          <section className="rounded-3xl bg-amber-50 p-5 text-sm font-bold text-amber-800">
            You can view household settings, but only the household owner can change shared settings or delete the household.
          </section>
        )}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-black text-slate-800">Family</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Family name</span>
              <input
                value={settings.name}
                onChange={(event) => update("name", event.target.value)}
                disabled={!canManage}
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-300"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Timezone</span>
              <select
                value={settings.timeZone}
                onChange={(event) => update("timeZone", event.target.value)}
                disabled={!canManage}
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-300"
              >
                {TIME_ZONES.map((zone) => (
                  <option key={zone.value} value={zone.value}>{zone.label}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-teal-100 p-3 text-teal-600">
              <Puzzle size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Feature Plugins</h2>
              <p className="text-sm font-semibold text-slate-500">Activate optional household tools when your family needs them.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {plugins.map((plugin) => (
              <div key={plugin.key} className="rounded-2xl border-2 border-slate-100 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-800">{plugin.label}</h3>
                    <p className="mt-1 text-sm font-semibold text-slate-500">{plugin.description}</p>
                    {plugin.dependencies.length > 0 && <p className="mt-2 text-xs font-bold text-slate-400">Requires: {plugin.dependencies.join(", ")}</p>}
                    {plugin.backgroundJobs.length > 0 && <p className="mt-1 text-xs font-bold text-slate-400">Scheduled work: {plugin.backgroundJobs.join(", ")}</p>}
                    <p className="mt-1 text-xs font-bold text-slate-400">Data is preserved when deactivated.</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-black uppercase ${plugin.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                    {plugin.active ? "Active" : "Off"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canManage || savingPlugin === plugin.key}
                    onClick={() => setPluginStatus(plugin, !plugin.active)}
                    className={`rounded-2xl px-4 py-2 text-sm font-black text-white transition-colors disabled:opacity-40 ${plugin.active ? "bg-slate-700 hover:bg-slate-800" : "bg-teal-500 hover:bg-teal-600"}`}
                  >
                    {savingPlugin === plugin.key ? "Saving..." : plugin.active ? "Deactivate" : "Activate"}
                  </button>
                  {plugin.active && (
                    <Link href={plugin.route} className="rounded-2xl bg-white px-4 py-2 text-sm font-black text-teal-600 shadow-sm hover:text-teal-700">
                      Open
                    </Link>
                  )}
                </div>
              </div>
            ))}
            {plugins.length === 0 && (
              <p className="rounded-2xl bg-slate-50 p-4 text-sm font-bold text-slate-400">No plugins are available yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-violet-100 p-3 text-violet-600">
              <LockKeyhole size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-800">Parent PIN</h2>
              <p className="text-sm font-semibold text-slate-500">Change the PIN for protected parent sections, or send yourself a reset link.</p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <PinInput
              label="Current PIN"
              value={pinForm.currentPin}
              onChange={(value) => updatePinField("currentPin", value)}
              autoComplete="current-password"
            />
            <PinInput
              label="New PIN"
              value={pinForm.newPin}
              onChange={(value) => updatePinField("newPin", value)}
              autoComplete="new-password"
            />
            <PinInput
              label="Confirm new PIN"
              value={pinForm.confirmPin}
              onChange={(value) => updatePinField("confirmPin", value)}
              autoComplete="new-password"
            />
          </div>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={changePin}
              disabled={pinSaving || pinForm.currentPin.length < 4 || pinForm.newPin.length < 4 || pinForm.confirmPin.length < 4}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-2.5 font-black text-white transition-colors hover:bg-violet-600 disabled:opacity-40"
            >
              <Save size={18} /> {pinSaving ? "Saving..." : "Change PIN"}
            </button>
            <button
              type="button"
              onClick={sendPinReset}
              disabled={pinResetSending}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-2.5 font-black text-slate-700 transition-colors hover:bg-slate-200 disabled:opacity-40"
            >
              <Mail size={18} /> {pinResetSending ? "Sending..." : "Email PIN reset link"}
            </button>
          </div>
          {pinResetUrl && (
            <a href={pinResetUrl} className="mt-3 block break-all text-xs font-bold text-violet-500 hover:text-violet-700">
              Development PIN reset link
            </a>
          )}
        </section>

        {calendarSyncActive && <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-orange-100 p-3 text-orange-600">
              <CalendarDays size={22} />
            </div>
            <h2 className="font-black text-slate-800">Google Calendar</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Enable Google Calendar integration" checked={settings.googleCalendarEnabled} disabled={!canManage} onChange={(value) => update("googleCalendarEnabled", value)} />
            <Toggle label="Sync chore assignments" checked={settings.googleCalendarSyncAssignments} disabled={!canManage} onChange={(value) => update("googleCalendarSyncAssignments", value)} />
            <Toggle label="Sync family calendar events" checked={settings.googleCalendarSyncEvents} disabled={!canManage} onChange={(value) => update("googleCalendarSyncEvents", value)} />
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Google calendar ID</span>
              <input
                value={settings.googleCalendarId}
                onChange={(event) => update("googleCalendarId", event.target.value)}
                disabled={!canManage}
                placeholder="primary or family-calendar-id"
                className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-orange-300"
              />
            </label>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-500">
            Family events created in ChoresList are sent to Google Calendar. Events already in Google Calendar are not imported.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canManage && (
              <a
                href="/api/google-calendar/connect"
                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm"
              >
                {connection ? "Reconnect Google Calendar" : "Connect Google Calendar"}
              </a>
            )}
            {canManage && connection && (
              <button
                type="button"
                onClick={syncCalendar}
                disabled={syncingCalendar}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-orange-100 px-4 py-2 text-sm font-black text-orange-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={syncingCalendar ? "animate-spin" : ""} />
                {syncingCalendar ? "Syncing..." : "Sync now"}
              </button>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                calendarStatus === "synced" || calendarStatus === "connected"
                  ? "bg-emerald-100 text-emerald-700"
                  : calendarStatus === "disconnected" || calendarStatus === "error"
                    ? "bg-red-100 text-red-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {calendarStatus === "synced" ? "Synced" : calendarStatus}
            </span>
            {connection?.googleAccountEmail && (
              <span className="text-sm font-bold text-slate-500">{connection.googleAccountEmail}</span>
            )}
            {lastSync && <span className="text-sm font-bold text-slate-500">Last sync: {lastSync}</span>}
          </div>
        </section>}

        {notificationsActive && <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-blue-100 p-3 text-blue-600">
              <Mail size={22} />
            </div>
            <h2 className="font-black text-slate-800">Email Notifications</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Toggle label="Enable email notifications" checked={settings.emailNotificationsEnabled} disabled={!canManage} onChange={(value) => update("emailNotificationsEnabled", value)} />
            <Toggle label="Daily summary" checked={settings.emailDailySummary} disabled={!canManage} onChange={(value) => update("emailDailySummary", value)} />
            <Toggle label="Weekly report" checked={settings.emailWeeklyReport} disabled={!canManage} onChange={(value) => update("emailWeeklyReport", value)} />
          </div>
        </section>}

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-600">
              <Shield size={22} />
            </div>
            <h2 className="font-black text-slate-800">Privacy</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle label="Show points on kid screens" checked={settings.privacyShowKidPoints} disabled={!canManage} onChange={(value) => update("privacyShowKidPoints", value)} />
            <Toggle label="Allow kids to add wish list items" checked={settings.privacyAllowKidWishlist} disabled={!canManage} onChange={(value) => update("privacyAllowKidWishlist", value)} />
            <Toggle label="Store completion photos" checked={settings.privacyStoreCompletionPhotos} disabled={!canManage} onChange={(value) => update("privacyStoreCompletionPhotos", value)} />
            <Toggle label="Opt in to product analytics" checked={settings.privacyAnalyticsOptIn} disabled={!canManage} onChange={(value) => update("privacyAnalyticsOptIn", value)} />
          </div>
        </section>

        {canManage && <section className="rounded-3xl border-2 border-red-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-red-100 p-3 text-red-600">
              <Trash2 size={22} />
            </div>
            <div>
              <h2 className="font-black text-red-600">Delete Account</h2>
              <p className="text-sm font-semibold text-slate-500">This permanently removes the household, parents, kids, tasks, points, photos, and settings.</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="block flex-1">
              <span className="text-sm font-bold text-slate-600">Type DELETE to confirm</span>
              <input
                value={deleteConfirm}
                onChange={(event) => setDeleteConfirm(event.target.value)}
                className="mt-1 w-full rounded-2xl border-2 border-red-100 bg-red-50 px-3 py-2 font-semibold text-red-700 outline-none focus:border-red-300"
              />
            </label>
            <button
              type="button"
              onClick={deleteAccount}
              disabled={deleting || deleteConfirm !== "DELETE"}
              className="flex items-center justify-center gap-2 rounded-2xl bg-red-500 px-4 py-2.5 font-black text-white transition-colors hover:bg-red-600 disabled:opacity-40"
            >
              <Trash2 size={18} /> {deleting ? "Deleting..." : "Delete Account"}
            </button>
          </div>
        </section>}
      </div> : <AdminConfigTab />}
    </div>
  );
}

function AdminConfigTab() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState("");

  const ownerCount = useMemo(
    () => data?.parents.filter((parent) => parent.accountRole === "owner").length ?? 0,
    [data]
  );

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/parent/admin");
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(payload?.error ?? "Could not load admin configuration");
      setLoading(false);
      return;
    }
    setData(payload);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function updateAdmin(action: string, body: Record<string, unknown>, success: string) {
    const key = `${action}:${Object.values(body).join(":")}`;
    setSavingKey(key);
    try {
      const res = await fetch("/api/parent/admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        toast.error(payload?.error ?? "Could not save admin change");
        return;
      }
      toast.success(success);
      await load();
    } finally {
      setSavingKey("");
    }
  }

  if (loading && !data) {
    return <div className="rounded-3xl bg-white p-6 text-center text-lg font-black text-slate-500 shadow-sm">Loading admin config...</div>;
  }

  if (!data) {
    return (
      <section className="rounded-3xl bg-white p-6 text-sm font-bold text-slate-500 shadow-sm">
        Admin configuration could not be loaded.
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-slate-800">
            <ShieldCheck size={24} className="text-slate-700" /> Admin Configuration
          </h2>
          <p className="text-sm font-semibold text-slate-500">Manage users and communities for {data.household.name}</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="flex w-fit items-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-black text-slate-600 shadow-sm transition-shadow hover:shadow-md disabled:opacity-50"
        >
          <RefreshCw size={18} /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Parent users" value={data.household._count.parents} icon={<UserCog size={22} />} />
        <SummaryCard label="Family profiles" value={data.household._count.members} icon={<Users size={22} />} />
        <SummaryCard label="Paired devices" value={data.household._count.devices} icon={<ShieldCheck size={22} />} />
        <SummaryCard label="Communities" value={data.communities.length} icon={<Building2 size={22} />} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-800">Parent Users</h2>
              <p className="text-sm font-semibold text-slate-500">Owners can change parent access levels.</p>
            </div>
            <Link href="/parent/members" className="text-sm font-black text-violet-600 hover:text-violet-700">Family profiles</Link>
          </div>

          <div className="space-y-3">
            {data.parents.map((parent) => {
              const cannotDemoteLastOwner = parent.accountRole === "owner" && ownerCount <= 1;
              return (
                <div key={parent.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate font-black text-slate-800">{parent.email}</p>
                      <p className="text-xs font-bold text-slate-500">
                        {parent.emailVerified ? "Verified" : "Unverified"} · {parent._count.communityMemberships} community memberships
                      </p>
                    </div>
                    <select
                      value={parent.accountRole}
                      disabled={cannotDemoteLastOwner || savingKey.startsWith("parentRole")}
                      onChange={(event) => updateAdmin("parentRole", { parentId: parent.id, accountRole: event.target.value }, "Parent role updated")}
                      className="rounded-2xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-violet-300 disabled:opacity-50"
                      title={cannotDemoteLastOwner ? "At least one owner is required" : "Change parent role"}
                    >
                      <option value="owner">Owner</option>
                      <option value="parent">Parent</option>
                      <option value="grandparent">Grandparent</option>
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-black text-slate-800">Communities</h2>
            <p className="text-sm font-semibold text-slate-500">Review connected communities and update household member roles.</p>
          </div>

          <div className="space-y-4">
            {data.communities.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-6 text-center">
                <p className="font-black text-slate-700">No connected communities yet</p>
                <Link href="/community" className="mt-3 inline-flex rounded-2xl bg-violet-500 px-4 py-2 font-black text-white hover:bg-violet-600">
                  Create Community
                </Link>
              </div>
            ) : data.communities.map((group) => (
              <div key={group.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-black text-slate-800">{group.name}</h3>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-500">{group.groupType}</span>
                      {group.ownedByHousehold && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">household owned</span>}
                      {!group.manageableByHousehold && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-700">view only</span>}
                    </div>
                    <p className="text-xs font-bold text-slate-500">
                      {group._count.members} members · {group._count.events} events · created by {group.creator.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={group.visibility}
                      disabled={!group.manageableByHousehold || savingKey.startsWith("communityVisibility")}
                      onChange={(event) => updateAdmin("communityVisibility", { groupId: group.id, visibility: event.target.value }, "Community visibility updated")}
                      className="rounded-2xl border-2 border-slate-100 bg-white px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-violet-300 disabled:opacity-50"
                    >
                      <option value="private">Private</option>
                      <option value="public">Public</option>
                    </select>
                    <Link href={`/community/${group.id}`} className="rounded-2xl bg-white p-2 text-slate-600 shadow-sm hover:shadow-md" title="Open community">
                      <ExternalLink size={18} />
                    </Link>
                  </div>
                </div>

                <div className="space-y-2">
                  {group.currentHouseholdMembers.map((member) => (
                    <div key={member.id} className="flex flex-col gap-2 rounded-xl bg-white p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-700">{member.parent.email}</p>
                        <p className="text-xs font-bold text-slate-400">{ROLE_LABELS[member.role] ?? member.role}</p>
                      </div>
                      <select
                        value={member.role}
                        disabled={!group.manageableByHousehold || savingKey.startsWith("communityMemberRole")}
                        onChange={(event) => updateAdmin("communityMemberRole", { groupId: group.id, parentId: member.parentId, role: event.target.value }, "Community member role updated")}
                        className="rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-sm font-black text-slate-700 outline-none focus:border-violet-300 disabled:opacity-50"
                      >
                        <option value="owner">Owner</option>
                        <option value="manager">Manager</option>
                        <option value="member">Member</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-3xl bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-black text-slate-800">Family Profiles</h2>
            <p className="text-sm font-semibold text-slate-500">Quick user profile overview for this household.</p>
          </div>
          <Link href="/parent/members" className="rounded-2xl bg-violet-500 px-4 py-2 text-sm font-black text-white hover:bg-violet-600">
            Manage Profiles
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.familyMembers.map((member) => (
            <div key={member.id} className="rounded-2xl bg-slate-50 p-4">
              <div className="mb-2 flex items-center gap-3">
                <span className="text-3xl">{member.avatar}</span>
                <div>
                  <p className="font-black text-slate-800">{member.name}</p>
                  <p className="text-xs font-bold text-slate-500">{ROLE_LABELS[member.role] ?? member.role} · age {member.age}</p>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-500">
                {member.totalPoints} points · {member._count.assignments} assignments · {member._count.devices} devices
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
      <p className="text-sm font-bold text-slate-500">{label}</p>
    </div>
  );
}

function Toggle({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="h-5 w-5 accent-violet-500"
      />
    </label>
  );
}

function PinInput({
  label,
  value,
  autoComplete,
  onChange,
}: {
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete={autoComplete}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-2xl border-2 border-slate-100 bg-slate-50 px-3 py-2 text-center font-mono text-xl font-black tracking-widest text-slate-800 outline-none focus:border-violet-300"
      />
    </label>
  );
}
