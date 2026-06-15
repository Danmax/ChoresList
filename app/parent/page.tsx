"use client";

import { type FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { Users, ListChecks, CalendarDays, DollarSign, BookOpen, Home, BarChart2, Gift, Wrench, Ticket, Mail, LockKeyhole, MonitorSmartphone, LogOut, Settings, UserPlus, Copy, Share2, CheckCircle2, ShoppingCart, ShieldCheck } from "lucide-react";

type AccountRole = "owner" | "parent" | "grandparent";
type InviteRole = "parent" | "grandparent";

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
  const [inviteUrl, setInviteUrl] = useState("");
  const [inviteRole, setInviteRole] = useState<InviteRole>("parent");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [communityInviteToken, setCommunityInviteToken] = useState("");
  const [communityReturnTo, setCommunityReturnTo] = useState("");
  const [pinResetToken, setPinResetToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
      setNotice("Sign in or create a parent account to join this community event.");
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
        body: JSON.stringify({ email, password, mode, householdName, inviteToken }),
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
        body: JSON.stringify({ email, password }),
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

  async function loadInvite(role: InviteRole = "parent") {
    setInviteLoading(true);
    setInviteRole(role);
    try {
      const res = await fetch(`/api/parent/invite?role=${role}`);
      const data = await res.json();
      if (data.ok && data.inviteUrl) {
        setInviteUrl(data.inviteUrl);
        setNotice("");
        setError("");
      } else {
        setError(
          data.needsPin
            ? "Unlock the parent PIN in a parent section, then come back to create an invite."
            : data.error ?? "Could not create invite link."
        );
      }
    } catch {
      setError("Could not create invite link.");
    } finally {
      setInviteLoading(false);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setNotice("Invite link copied.");
  }

  async function shareInvite() {
    if (!inviteUrl) return;
    if (navigator.share) {
      await navigator.share({
        title: inviteRole === "grandparent" ? "Join my ChoresList family as a grandparent" : "Join my ChoresList household",
        text: inviteRole === "grandparent"
          ? "Create a grandparent account to stay connected with our family chore app."
          : "Create a parent account to join our family chore app.",
        url: inviteUrl,
      });
      return;
    }
    await copyInvite();
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">
            {mode === "signup" ? "Create Household" : mode === "forgot" ? "Reset Password" : mode === "reset" ? "New Password" : "Parent Panel"}
          </h1>
          <p className="text-slate-500 font-semibold mb-6">
            {mode === "signup"
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
                  placeholder="The Maldonado Family"
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
              {checking ? "Checking..." : mode === "forgot" ? "Send Reset Link" : mode === "reset" ? "Update Password" : mode === "signup" ? "Create Account" : "Sign In"}
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
              {mode === "signup" ? "Already have an account? Sign in" : "Create a household account"}
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
    );
  }

  const sections = [
    { href: "/parent/members", icon: Users, label: "Family Members", desc: "Add/edit kids and profiles", color: "#a78bfa", bg: "#ede9fe", roles: ["owner", "parent"] },
    { href: "/parent/chores", icon: ListChecks, label: "Chore Library", desc: "Browse, assign & AI instructions", color: "#60a5fa", bg: "#dbeafe", roles: ["owner", "parent"] },
    { href: "/parent/assign", icon: CalendarDays, label: "Assign Chores", desc: "Set daily, weekly & special tasks", color: "#34d399", bg: "#d1fae5", roles: ["owner", "parent"] },
    { href: "/parent/tasks", icon: CheckCircle2, label: "Parent Tasks", desc: "Complete chores assigned to parents", color: "#14b8a6", bg: "#ccfbf1", roles: ["owner", "parent"] },
    { href: "/parent/allowance", icon: DollarSign, label: "Allowance", desc: "Review points, pay out credits", color: "#fbbf24", bg: "#fef3c7", roles: ["owner", "parent"] },
    { href: "/parent/projects", icon: Wrench, label: "House Projects", desc: "Fix-it tasks with reward tickets", color: "#f97316", bg: "#ffedd5", roles: ["owner", "parent"] },
    { href: "/parent/groceries", icon: ShoppingCart, label: "Grocery Lists", desc: "Plan shopping & recurring staples", color: "#22c55e", bg: "#dcfce7", roles: ["owner", "parent"] },
    { href: "/parent/tickets", icon: Ticket, label: "Reward Tickets", desc: "Cash in earned rewards", color: "#eab308", bg: "#fefce8", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/reports", icon: BarChart2, label: "Reports", desc: "Charts, completions & points trends", color: "#10b981", bg: "#d1fae5", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/devices", icon: MonitorSmartphone, label: "Device Screens", desc: "Pair QR task boards for kids", color: "#6366f1", bg: "#e0e7ff", roles: ["owner", "parent"] },
    { href: "/parent/wishlist", icon: Gift, label: "Wish Lists", desc: "View kids' wishes & requests", color: "#f472b6", bg: "#fce7f3", roles: ["owner", "parent", "grandparent"] },
    { href: "/calendar", icon: BookOpen, label: "Family Calendar", desc: "See family events & activities", color: "#f97316", bg: "#ffedd5", roles: ["owner", "parent", "grandparent"] },
    { href: "/community", icon: Users, label: "Community", desc: "Groups, events, RSVP & potlucks", color: "#8b5cf6", bg: "#ede9fe", roles: ["owner", "parent", "grandparent"] },
    { href: "/parent/admin", icon: ShieldCheck, label: "Super Admin Config", desc: "Manage users & communities", color: "#0f172a", bg: "#e2e8f0", roles: ["owner"] },
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
          {accountRole === "owner" && (
            <>
              <button
                type="button"
                onClick={() => loadInvite("parent")}
                disabled={inviteLoading}
                className="flex items-center justify-center gap-2 bg-violet-500 text-white rounded-2xl px-4 py-2.5 shadow-sm font-bold hover:bg-violet-600 transition-colors disabled:opacity-60"
              >
                <UserPlus size={18} /> {inviteLoading && inviteRole === "parent" ? "Loading..." : "Invite Parent"}
              </button>
              <button
                type="button"
                onClick={() => loadInvite("grandparent")}
                disabled={inviteLoading}
                className="flex items-center justify-center gap-2 bg-emerald-500 text-white rounded-2xl px-4 py-2.5 shadow-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-60"
              >
                <UserPlus size={18} /> {inviteLoading && inviteRole === "grandparent" ? "Loading..." : "Invite Grandparent"}
              </button>
            </>
          )}
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

      {inviteUrl && (
        <div className="mb-6 rounded-3xl bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-black text-slate-800">Share parent access</p>
              <p className="text-xs font-black uppercase tracking-wide text-violet-500">
                {inviteRole === "grandparent" ? "Grandparent invite" : "Parent invite"}
              </p>
              <p className="truncate text-sm font-semibold text-slate-500">{inviteUrl}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copyInvite}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-200"
              >
                <Copy size={16} /> Copy
              </button>
              <button
                type="button"
                onClick={shareInvite}
                className="inline-flex items-center gap-2 rounded-2xl bg-violet-100 px-4 py-2 text-sm font-bold text-violet-700 hover:bg-violet-200"
              >
                <Share2 size={16} /> Share
              </button>
            </div>
          </div>
        </div>
      )}

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
