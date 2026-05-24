"use client";

import { type FormEvent, useState, useEffect } from "react";
import Link from "next/link";
import { Users, ListChecks, CalendarDays, DollarSign, BookOpen, Home, BarChart2, Gift, Wrench, Ticket, Mail, LockKeyhole } from "lucide-react";

export default function ParentPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch("/api/parent/auth")
      .then((res) => res.json())
      .then(({ ok }) => setUnlocked(Boolean(ok)))
      .catch(() => setUnlocked(false));
  }, []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setChecking(true);
    try {
      const res = await fetch("/api/parent/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const { ok } = await res.json();
      if (ok) {
        setUnlocked(true);
        setError("");
      } else {
        setError("Email or password is incorrect.");
        setPassword("");
      }
    } catch {
      setError("Couldn't verify your login. Try again.");
      setPassword("");
    } finally {
      setChecking(false);
    }
  }

  function lock() {
    fetch("/api/parent/auth", { method: "DELETE" }).catch(() => {});
    setUnlocked(false);
    setPassword("");
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Parent Panel</h1>
          <p className="text-slate-500 font-semibold mb-6">Sign in with your parent account</p>

          <form onSubmit={submitLogin} className="space-y-4 text-left">
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

            <label className="block">
              <span className="text-sm font-bold text-slate-600">Password</span>
              <div className="mt-1 flex items-center gap-2 rounded-2xl border-2 border-slate-200 bg-slate-50 px-3 py-2 focus-within:border-violet-400">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent font-semibold text-slate-800 outline-none"
                  required
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={checking}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white rounded-2xl py-3 text-lg font-bold transition-colors disabled:opacity-40"
            >
              {checking ? "Checking..." : "Sign In"}
            </button>
          </form>

          {error && <p className="text-red-500 font-bold text-sm">{error}</p>}

          <p className="text-slate-400 text-xs mt-4">Default login: parent@example.com / ChangeMe123!</p>

          <Link href="/dashboard" className="block mt-4 text-slate-400 text-sm font-semibold hover:text-slate-600">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const sections = [
    { href: "/parent/members", icon: Users, label: "Family Members", desc: "Add/edit kids and profiles", color: "#a78bfa", bg: "#ede9fe" },
    { href: "/parent/chores", icon: ListChecks, label: "Chore Library", desc: "Browse, assign & AI instructions", color: "#60a5fa", bg: "#dbeafe" },
    { href: "/parent/assign", icon: CalendarDays, label: "Assign Chores", desc: "Set daily, weekly & special tasks", color: "#34d399", bg: "#d1fae5" },
    { href: "/parent/allowance", icon: DollarSign, label: "Allowance", desc: "Review points, pay out credits", color: "#fbbf24", bg: "#fef3c7" },
    { href: "/parent/projects", icon: Wrench, label: "House Projects", desc: "Fix-it tasks with reward tickets", color: "#f97316", bg: "#ffedd5" },
    { href: "/parent/tickets", icon: Ticket, label: "Reward Tickets", desc: "Cash in earned rewards", color: "#eab308", bg: "#fefce8" },
    { href: "/parent/reports", icon: BarChart2, label: "Reports", desc: "Charts, completions & points trends", color: "#10b981", bg: "#d1fae5" },
    { href: "/parent/wishlist", icon: Gift, label: "Wish Lists", desc: "Grant kids' wishes & requests", color: "#f472b6", bg: "#fce7f3" },
    { href: "/calendar", icon: BookOpen, label: "Family Calendar", desc: "Schedule events & activities", color: "#f97316", bg: "#ffedd5" },
  ];

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800">🔧 Parent Panel</h1>
          <p className="text-slate-500 font-semibold">Manage your family&apos;s chore system</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow"
          >
            <Home size={18} /> Dashboard
          </Link>
          <button
            onClick={lock}
            className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm font-bold text-red-500 hover:shadow-md transition-shadow"
          >
            🔒 Lock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {sections.map((s) => (
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
