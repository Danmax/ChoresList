"use client";

import { type FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { Users, ListChecks, CalendarDays, DollarSign, Home, BarChart2, Gift, Wrench, Ticket, Mail, LockKeyhole, MonitorSmartphone, LogOut, Settings, CheckCircle2, ShoppingCart, Network, GraduationCap, ChefHat, HeartHandshake } from "lucide-react";

type AccountRole = "owner" | "parent" | "grandparent";

type Plugin = {
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

type CommunityInvitePreview = {
  role: "owner" | "manager" | "member";
  returnTo: string;
  group: {
    id: string;
    name: string;
    groupType: string;
    description: string | null;
    location: string | null;
  };
  event: {
    id: string;
    title: string;
    eventType: string;
    date: string;
    endDate: string | null;
    allDay: boolean;
    location: string | null;
    imageUrl: string | null;
    notes: string | null;
  } | null;
};

export default function ParentPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [accountRole, setAccountRole] = useState<AccountRole>("parent");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">("login");
  const [householdName, setHouseholdName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmUrl, setConfirmUrl] = useState("");
  const [canResendConfirmation, setCanResendConfirmation] = useState(false);
  const [checking, setChecking] = useState(false);
  const [inviteToken, setInviteToken] = useState("");
  const [communityInviteToken, setCommunityInviteToken] = useState("");
  const [communityReturnTo, setCommunityReturnTo] = useState("");
  const [communityInvitePreview, setCommunityInvitePreview] = useState<CommunityInvitePreview | null>(null);
  const [pinResetToken, setPinResetToken] = useState("");
  const [plugins, setPlugins] = useState<Plugin[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signup") === "1") {
      setMode("signup");
      setNotice("Create your free ChoresList account.");
    }
    if (params.has("confirmed")) setNotice("Email confirmed. You can sign in now.");
    if (params.has("confirmError")) setError("Confirmation link is invalid or expired.");
    const token = params.get("reset");
    if (token) {
      setResetToken(token);
      setMode("reset");
      setNotice("Choose a new parent password.");
    }
    const invite = params.get("invite");
    if (invite) {
      setInviteToken(invite);
      setMode("signup");
      setNotice("Create a parent account to join this household.");
    }
    const communityInvite = params.get("communityInvite");
    if (communityInvite) {
      setCommunityInviteToken(communityInvite);
      setCommunityReturnTo(params.get("returnTo") ?? "");
      setMode("signup");
      setNotice("Sign in or create a parent account to join this community.");
      fetch(`/api/community/invites?token=${encodeURIComponent(communityInvite)}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => setCommunityInvitePreview(data?.invite ?? null))
        .catch(() => setCommunityInvitePreview(null));
    }
    const nextPinResetToken = params.get("pinReset") ?? "";
    if (nextPinResetToken) {
      setPinResetToken(nextPinResetToken);
      resetPinFromEmail(nextPinResetToken);
    }

    fetch("/api/parent/auth")
      .then((res) => res.json())
      .then(({ ok, accountRole: nextAccountRole }) => {
        if (ok && communityInvite) {
          acceptCommunityInvite(communityInvite, params.get("returnTo") ?? "");
          return;
        }
        if (nextAccountRole === "owner" || nextAccountRole === "parent" || nextAccountRole === "grandparent") {
          setAccountRole(nextAccountRole);
        }
        setUnlocked(Boolean(ok));
        if (ok) {
          fetch("/api/plugins")
            .then((res) => res.ok ? res.json() : null)
            .then((data) => setPlugins(Array.isArray(data?.plugins) ? data.plugins : []))
            .catch(() => setPlugins([]));
        }
      })
      .catch(() => setUnlocked(false));
  }, []);

  async function resetPinFromEmail(token = pinResetToken) {
    if (!token) return;
    try {
      const res = await fetch("/api/parent/pin-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error ?? "PIN reset link is invalid or expired.");
        return;
      }
      setPinResetToken("");
      setNotice("Parent PIN reset. Sign in, then open a parent section to set a new PIN.");
      setError("");
      window.history.replaceState({}, "", "/parent");
    } catch {
      setError("Could not reset parent PIN.");
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === "forgot") {
      await requestPasswordReset();
      return;
    }
    if (mode === "reset") {
      await resetPassword();
      return;
    }

    setChecking(true);
    try {
      const res = await fetch("/api/parent/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, mode, householdName, inviteToken, communityInviteToken, communityReturnTo }),
      });
      const data = await res.json();
      if (data.ok && data.needsConfirmation) {
        setNotice("Account created. Confirm your email, then sign in.");
        setConfirmUrl(data.confirmUrl ?? "");
        setCanResendConfirmation(false);
        setMode("login");
        setPassword("");
        setError("");
      } else if (data.ok) {
        if (communityInviteToken) {
          await acceptCommunityInvite();
          return;
        }
        if (data.accountRole === "owner" || data.accountRole === "parent" || data.accountRole === "grandparent") {
          setAccountRole(data.accountRole);
        }
        setUnlocked(true);
        setError("");
        setNotice("");
      } else {
        setError(data.error ?? "Email or password is incorrect.");
        setCanResendConfirmation(Boolean(data.needsConfirmation));
        if (!data.needsConfirmation) setPassword("");
      }
    } catch {
      setError("Couldn't verify your login. Try again.");
      setPassword("");
    } finally {
      setChecking(false);
    }
  }

  async function acceptCommunityInvite(token = communityInviteToken, returnTo = communityReturnTo) {
    try {
      const res = await fetch("/api/community/invites", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setUnlocked(true);
        setError(data?.error ?? "Could not accept the community invite.");
        return false;
      }
      const destination = data?.returnTo ?? returnTo;
      if (typeof destination === "string" && destination.startsWith("/")) {
        window.location.assign(destination);
        return true;
      }
      setCommunityInviteToken("");
      setCommunityReturnTo("");
      window.history.replaceState({}, "", "/parent");
      setUnlocked(true);
      setError("");
      setNotice("Community invite accepted.");
      return false;
    } catch {
      setUnlocked(true);
      setError("Could not accept the community invite.");
      return false;
    }
  }

  async function requestPasswordReset() {
    setChecking(true);
    try {
      const res = await fetch("/api/parent/password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice("If that email has a parent account, a reset link has been sent.");
        setConfirmUrl(data.resetUrl ?? "");
        setError("");
      } else {
        setError(data.error ?? "Could not send reset link.");
      }
    } catch {
      setError("Could not send reset link.");
    } finally {
      setChecking(false);
    }
  }

  async function resetPassword() {
    setChecking(true);
    try {
      const res = await fetch("/api/parent/password-reset", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, password }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice("Password updated. Sign in with your new password.");
        setMode("login");
        setPassword("");
        setResetToken("");
        setConfirmUrl("");
        setError("");
        window.history.replaceState({}, "", "/parent");
      } else {
        setError(data.error ?? "Could not reset password.");
      }
    } catch {
      setError("Could not reset password.");
    } finally {
      setChecking(false);
    }
  }

  async function resendConfirmation() {
    setChecking(true);
    try {
      const res = await fetch("/api/parent/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, communityInviteToken, communityReturnTo }),
      });
      const data = await res.json();
      if (data.ok) {
        setNotice(data.message ?? "Confirmation sent.");
        setConfirmUrl(data.confirmUrl ?? "");
        setError("");
        setCanResendConfirmation(false);
      } else {
        setError(data.error ?? "Could not resend confirmation.");
      }
    } catch {
      setError("Could not resend confirmation.");
    } finally {
      setChecking(false);
    }
  }

  function lock() {
    fetch("/api/parent/auth", { method: "DELETE" }).catch(() => {});
    setUnlocked(false);
    setPassword("");
  }

  function communityEventDate() {
    const date = communityInvitePreview?.event?.date;
    if (!date) return "";
    return new Date(date).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (!unlocked) {
    const isCommunityInvite = Boolean(communityInviteToken);
    const inviteEvent = communityInvitePreview?.event;
    const isCommunityEventInvite = Boolean(inviteEvent);
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className={`grid w-full gap-4 ${isCommunityInvite ? "max-w-5xl lg:grid-cols-[minmax(0,1fr)_400px]" : "max-w-sm"}`}>
          {isCommunityInvite && (
            <section className="overflow-hidden rounded-3xl bg-white text-left shadow-xl">
              {inviteEvent?.imageUrl?.startsWith("/uploads/") && (
                <img src={inviteEvent.imageUrl} alt="" className="h-52 w-full object-cover" />
              )}
              <div className="p-6 sm:p-8">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-sm font-black text-violet-700">
                  <Users size={16} /> {isCommunityEventInvite ? "Community event invite" : "Community invite"}
                </div>
                <h1 className="text-3xl font-black text-slate-800">
                  {inviteEvent?.title ?? `Join ${communityInvitePreview?.group.name ?? "this community"}`}
                </h1>
                <div className="mt-3 space-y-2 text-sm font-bold text-slate-500">
                  {communityInvitePreview?.group.name && (
                    <p className="inline-flex items-center gap-2"><Users size={16} /> {communityInvitePreview.group.name}</p>
                  )}
                  {communityEventDate() && (
                    <p className="inline-flex items-center gap-2"><CalendarDays size={16} /> {communityEventDate()}</p>
                  )}
                  {(inviteEvent?.location || communityInvitePreview?.group.location) && (
                    <p>{inviteEvent?.location ?? communityInvitePreview?.group.location}</p>
                  )}
                </div>
                {inviteEvent?.notes && <p className="mt-4 whitespace-pre-wrap text-sm font-semibold leading-6 text-slate-600">{inviteEvent.notes}</p>}

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <CheckCircle2 size={20} className="mb-2 text-emerald-500" />
                    <p className="text-sm font-black text-slate-800">{isCommunityEventInvite ? "RSVP" : "Join group"}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{isCommunityEventInvite ? "Let the host know who is coming." : "Become a member after account setup."}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <ShoppingCart size={20} className="mb-2 text-emerald-500" />
                    <p className="text-sm font-black text-slate-800">{isCommunityEventInvite ? "Claim items" : "See events"}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">{isCommunityEventInvite ? "Choose a dish or supplies to bring." : "View group events and details."}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <CalendarDays size={20} className="mb-2 text-emerald-500" />
                    <p className="text-sm font-black text-slate-800">Stay updated</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">See event details after you join.</p>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-violet-50 p-4">
                  <h2 className="font-black text-slate-800">What is ChoresList?</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
                    ChoresList helps families and groups coordinate chores, calendars, grocery lists, community events, and potluck items from one private account.
                  </p>
                </div>
              </div>
            </section>
          )}

        <div className="bg-white rounded-3xl shadow-xl p-8 w-full text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            {isCommunityInvite && mode === "signup" ? (isCommunityEventInvite ? "Join Event" : "Join Group") : mode === "signup" ? "Create Household" : mode === "forgot" ? "Reset Password" : mode === "reset" ? "New Password" : "Parent Panel"}
          </h1>
          <p className="text-slate-500 font-semibold mb-6">
            {isCommunityInvite && mode === "signup"
              ? isCommunityEventInvite ? "Create an account to RSVP and participate" : "Create an account to join this community group"
              : mode === "signup"
              ? "Start a private family workspace"
              : mode === "forgot"
                ? "Send a password reset link"
                : mode === "reset"
                  ? "Enter a new parent password"
                  : "Sign in with your parent account"}
          </p>

          <form onSubmit={submitLogin} className="space-y-4 text-left">
            {mode === "signup" && !inviteToken && (
              <label className="block">
                <span className="text-sm font-bold text-slate-600">Household name</span>
                <input
                  type="text"
                  value={householdName}
                  onChange={(event) => setHouseholdName(event.target.value)}
                  autoComplete="organization"
                  className="mt-1 w-full rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 font-semibold text-slate-800 outline-none focus:border-violet-400"
                  placeholder={isCommunityInvite ? "Your family or name" : "The Maldonado Family"}
                />
              </label>
            )}

            {mode !== "reset" && (
            <label className="block">
              <span className="text-sm font-bold text-slate-600">Email</span>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-violet-400">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none"
                  required
                />
              </div>
            </label>
            )}

            {mode !== "forgot" && (
              <label className="block">
                <span className="text-sm font-bold text-slate-600">Password</span>
                <div className="mt-1 flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-violet-400">
                  <LockKeyhole size={18} className="text-slate-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={mode === "reset" || mode === "signup" ? "new-password" : "current-password"}
                    className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none"
                    required
                  />
                </div>
              </label>
            )}

            <button
              type="submit"
              disabled={checking || (mode === "forgot" && !email) || (mode === "reset" && !password)}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-2xl py-3 text-lg font-bold transition-colors disabled:opacity-40"
            >
              {checking ? "Checking..." : mode === "forgot" ? "Send Reset Link" : mode === "reset" ? "Update Password" : mode === "signup" ? (isCommunityInvite ? "Create Account & Join" : "Create Account") : "Sign In"}
            </button>
          </form>

          {notice && <p className="mt-4 text-emerald-600 font-bold text-sm">{notice}</p>}
          {confirmUrl && (
            <a href={confirmUrl} className="mt-2 block break-all text-xs font-bold text-violet-500 hover:text-violet-700">
              Development confirmation link
            </a>
          )}
          {error && <p className="text-red-500 font-bold text-sm">{error}</p>}
          {canResendConfirmation && (
            <button
              type="button"
              onClick={resendConfirmation}
              disabled={!email || !password || checking}
              className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              Resend confirmation email
            </button>
          )}

          {mode !== "reset" && (
            <button
              type="button"
              onClick={() => {
                setMode((current) => (current === "login" ? "signup" : "login"));
                if (!communityInviteToken) {
                  setInviteToken("");
                  window.history.replaceState({}, "", "/parent");
                }
                setError("");
                setNotice("");
                setConfirmUrl("");
              }}
              className="mt-4 text-sm font-bold text-violet-500 hover:text-violet-700"
            >
              {mode === "signup" ? "Already have an account? Sign in" : isCommunityInvite ? "Create an account to join" : "Create a household account"}
            </button>
          )}

          {mode !== "signup" && (
            <button
              type="button"
              onClick={() => {
                setMode((current) => (current === "forgot" || current === "reset" ? "login" : "forgot"));
                setError("");
                setNotice("");
                setConfirmUrl("");
              }}
              className="mt-3 block w-full text-sm font-bold text-slate-400 hover:text-slate-600"
            >
              {mode === "forgot" || mode === "reset" ? "Back to sign in" : "Forgot password?"}
            </button>
          )}

          <Link href="/dashboard" className="block mt-4 text-slate-400 text-sm font-semibold hover:text-slate-600">
            ← Back to Dashboard
          </Link>
        </div>
        </div>
      </div>
    );
  }

  const pluginSections = plugins
    .filter((plugin) => plugin.active && plugin.showInNavigation !== false)
    .map((plugin) => ({
      href: plugin.route,
      icon: plugin.key === "education-academy" ? GraduationCap
        : plugin.key === "recipes" ? ChefHat
        : plugin.key === "family-tree" ? Network
        : plugin.key === "grocery-pantry" ? ShoppingCart
        : plugin.key === "community-events" ? Users
        : plugin.key === "reports-coaching" ? BarChart2
        : plugin.key === "emotional-wellbeing" ? HeartHandshake
        : CalendarDays,
      label: plugin.label,
      desc: plugin.description,
      color: plugin.color ?? "#14b8a6",
      bg: plugin.bg ?? "#ccfbf1",
      roles: plugin.roles,
    }));

  const sections = [
    { href: "/parent/members", icon: Users, label: "Family Members", desc: "Add/edit kids and profiles", color: "#a78bfa", bg: "#ede9fe", roles: ["owner", "parent"] },
    ...pluginSections,
    { href: "/parent/chores", icon: ListChecks, label: "Chore Library", desc: "Browse, assign & AI instructions", color: "#60a5fa", bg: "#dbeafe", roles: ["owner", "parent"] },
    { href: "/parent/assign", icon: CalendarDays, label: "Assign & Complete Chores", desc: "Manage chores for children in your care", color: "#34d399", bg: "#d1fae5", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/tasks", icon: CheckCircle2, label: "Parent Tasks", desc: "Complete chores assigned to parents", color: "#14b8a6", bg: "#ccfbf1", roles: ["owner", "parent"] },
    { href: "/parent/allowance", icon: DollarSign, label: "Allowance", desc: "Review points, pay out credits", color: "#fbbf24", bg: "#fef3c7", roles: ["owner", "parent"] },
    { href: "/parent/projects", icon: Wrench, label: "House Projects", desc: "Projects that earn reward tickets", color: "#f97316", bg: "#ffedd5", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/tickets", icon: Ticket, label: "Reward Tickets", desc: "Cash in earned rewards", color: "#eab308", bg: "#fefce8", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/devices", icon: MonitorSmartphone, label: "Device Screens", desc: "Pair QR task boards for kids", color: "#6366f1", bg: "#e0e7ff", roles: ["owner", "parent"] },
    { href: "/parent/wishlist", icon: Gift, label: "Wish Lists", desc: "View kids' wishes & requests", color: "#f472b6", bg: "#fce7f3", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/settings", icon: Settings, label: "Household Settings", desc: "Account, PIN, email & privacy", color: "#64748b", bg: "#f1f5f9", roles: ["owner", "parent", "grandparent"] },
  ];
  const visibleSections = sections.filter((section) => section.roles.includes(accountRole));
  const roleLabel = accountRole === "grandparent" ? "Grandparent Access" : accountRole === "owner" ? "Owner Access" : "Parent Access";

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800">
            {accountRole === "grandparent" ? "👵 Grandparent Access" : "🔧 Parent Panel"}
          </h1>
          <p className="text-slate-500 font-semibold">
            {accountRole === "grandparent" ? "Stay connected with family progress and events" : "Manage your family's chore system"}
          </p>
          <p className="mt-1 text-xs font-black uppercase tracking-wide text-violet-500">{roleLabel}</p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:flex">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow"
          >
            <Home size={18} /> Dashboard
          </Link>
          <button
            onClick={lock}
            className="flex items-center justify-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm font-bold text-red-500 hover:shadow-md transition-shadow"
            title="Sign out of the parent account on this device"
          >
            <LogOut size={18} /> Sign out
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visibleSections.map((s) => (
          <Link key={s.href} href={s.href}>
            <div
              className="rounded-3xl p-6 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer"
              style={{ backgroundColor: s.bg, border: `2px solid ${s.color}44` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: s.color + "33" }}
              >
                <s.icon size={24} style={{ color: s.color }} />
              </div>
              <h2 className="text-lg font-black text-slate-800 mb-1">{s.label}</h2>
              <p className="text-slate-500 font-semibold text-sm">{s.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
