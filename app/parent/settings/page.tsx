"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, LockKeyhole, Mail, Save, Shield, Trash2 } from "lucide-react";
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

export default function ParentSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pinForm, setPinForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [pinSaving, setPinSaving] = useState(false);
  const [pinResetSending, setPinResetSending] = useState(false);
  const [pinResetUrl, setPinResetUrl] = useState("");
  const canManage = settings.canManageHousehold;
  const connection = settings.googleCalendarConnection;
  const calendarStatus = connection?.syncStatus ?? "not connected";
  const lastSync = connection?.lastSyncAt
    ? new Date(connection.lastSyncAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })
    : null;

  const load = useCallback(async () => {
    const res = await fetch("/api/parent/settings");
    if (!res.ok) {
      toast.error("Could not load household settings");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setSettings({
      ...DEFAULT_SETTINGS,
      ...data,
      googleCalendarId: data.googleCalendarId ?? "",
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
              {settings.parentEmail} · {settings.accountRole === "owner" ? "Owner" : "Parent"}
            </p>
          </div>
        </div>
        {canManage && (
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

      <div className="space-y-5">
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

        <section className="rounded-3xl bg-white p-5 shadow-sm">
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {canManage && (
              <a
                href="/api/google-calendar/connect"
                className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-black text-white shadow-sm"
              >
                {connection ? "Reconnect Google Calendar" : "Connect Google Calendar"}
              </a>
            )}
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase tracking-wide ${
                calendarStatus === "synced" || calendarStatus === "connected"
                  ? "bg-emerald-100 text-emerald-700"
                  : calendarStatus === "disconnected"
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
        </section>

        <section className="rounded-3xl bg-white p-5 shadow-sm">
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
        </section>

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
      </div>
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
