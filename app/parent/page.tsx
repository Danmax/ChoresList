"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ListChecks, CalendarDays, DollarSign, BookOpen, Home } from "lucide-react";

const PARENT_PIN = "1234";

export default function ParentPanel() {
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const stored = sessionStorage.getItem("parent-unlocked");
    if (stored === "true") setUnlocked(true);
  }, []);

  function submitPin() {
    if (pin === PARENT_PIN) {
      sessionStorage.setItem("parent-unlocked", "true");
      setUnlocked(true);
      setError("");
    } else {
      setError("Wrong PIN, try again!");
      setPin("");
    }
  }

  function lock() {
    sessionStorage.removeItem("parent-unlocked");
    setUnlocked(false);
    setPin("");
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-black text-slate-800 mb-2">Parent Panel</h1>
          <p className="text-slate-500 font-semibold mb-6">Enter your 4-digit PIN</p>

          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-12 h-12 rounded-2xl border-2 border-slate-200 flex items-center justify-center text-2xl font-black text-slate-800"
              >
                {pin[i] ? "●" : ""}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <button
                key={n}
                onClick={() => pin.length < 4 && setPin((p) => p + n)}
                className="bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 text-xl font-bold text-slate-700 transition-colors"
              >
                {n}
              </button>
            ))}
            <button
              onClick={() => setPin((p) => p.slice(0, -1))}
              className="bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 text-xl font-bold text-slate-700 transition-colors"
            >
              ⌫
            </button>
            <button
              onClick={() => pin.length < 4 && setPin((p) => p + "0")}
              className="bg-slate-100 hover:bg-slate-200 rounded-2xl py-3 text-xl font-bold text-slate-700 transition-colors"
            >
              0
            </button>
            <button
              onClick={submitPin}
              disabled={pin.length !== 4}
              className="bg-violet-500 hover:bg-violet-600 text-white rounded-2xl py-3 text-xl font-bold transition-colors disabled:opacity-40"
            >
              ✓
            </button>
          </div>

          {error && <p className="text-red-500 font-bold text-sm">{error}</p>}

          <p className="text-slate-400 text-xs mt-4">Default PIN: 1234 — change in settings</p>

          <Link href="/" className="block mt-4 text-slate-400 text-sm font-semibold hover:text-slate-600">
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
    { href: "/calendar", icon: BookOpen, label: "Family Calendar", desc: "Schedule events & activities", color: "#f472b6", bg: "#fce7f3" },
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
            href="/"
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
