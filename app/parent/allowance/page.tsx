"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, DollarSign, CheckCircle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { formatCurrency, getWeekStart } from "@/lib/allowance";

interface Member {
  id: number;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;
  allowanceSetting?: { weeklyBaseRate: number; pointsToDollar: number } | null;
}

interface Allowance {
  id: number;
  memberId: number;
  weekStart: string;
  pointsEarned: number;
  amountEarned: number;
  paidOut: boolean;
  member: Member;
}

export default function AllowancePage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [allowances, setAllowances] = useState<Allowance[]>([]);
  const [settingsForm, setSettingsForm] = useState<Record<number, { base: number; rate: number }>>({});

  const load = useCallback(async () => {
    const [mRes, aRes] = await Promise.all([
      fetch("/api/members"),
      fetch("/api/allowance"),
    ]);
    const mDataRaw = await mRes.json().catch(() => []);
    const mData: Member[] = Array.isArray(mDataRaw) ? mDataRaw : Array.isArray(mDataRaw?.members) ? mDataRaw.members : [];
    if (!Array.isArray(mDataRaw) && !Array.isArray(mDataRaw?.members)) toast.error(mDataRaw.error ?? "Could not load members");
    setMembers(mData.filter((m) => (m as unknown as { role: string }).role === "child"));
    setAllowances(await aRes.json());

    const initialSettings: Record<number, { base: number; rate: number }> = {};
    mData.forEach((m) => {
      initialSettings[m.id] = {
        base: m.allowanceSetting?.weeklyBaseRate ?? 0,
        rate: m.allowanceSetting?.pointsToDollar ?? 0.10,
      };
    });
    setSettingsForm(initialSettings);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveSettings(memberId: number) {
    const s = settingsForm[memberId];
    if (!s) return;
    await fetch("/api/allowance", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, weeklyBaseRate: s.base, pointsToDollar: s.rate }),
    });
    toast.success("Allowance settings saved!");
    load();
  }

  async function markPaid(id: number) {
    await fetch("/api/allowance", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, paidOut: true }),
    });
    toast.success("Marked as paid! 💸");
    load();
  }

  const thisWeek = getWeekStart().toISOString().split("T")[0];
  const thisWeekAllowances = allowances.filter(
    (a) => a.weekStart.split("T")[0] === thisWeek
  );

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800">💰 Allowance</h1>
      </div>

      {/* This week summary */}
      <div className="mb-8">
        <h2 className="text-lg font-black text-slate-700 mb-3">This Week</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const wa = thisWeekAllowances.find((a) => a.memberId === member.id);
            const settings = member.allowanceSetting;
            const earned = wa?.amountEarned ?? 0;
            const points = wa?.pointsEarned ?? 0;

            return (
              <div
                key={member.id}
                className="bg-white rounded-3xl p-5 shadow-sm"
                style={{ border: `2px solid ${member.color}44` }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{member.avatar}</span>
                  <div>
                    <p className="font-black text-slate-800">{member.name}</p>
                    <p className="text-sm text-slate-500 font-semibold">{points} pts earned</p>
                  </div>
                </div>

                <div className="bg-emerald-50 rounded-2xl p-3 mb-3 flex items-center justify-between">
                  <span className="font-black text-emerald-700 text-lg">{formatCurrency(earned)}</span>
                  {wa && !wa.paidOut ? (
                    <button
                      onClick={() => markPaid(wa.id)}
                      className="flex items-center gap-1 bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-emerald-600 transition-colors"
                    >
                      <DollarSign size={14} /> Pay Out
                    </button>
                  ) : wa?.paidOut ? (
                    <span className="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                      <CheckCircle size={14} /> Paid ✓
                    </span>
                  ) : null}
                </div>

                {settings && (
                  <p className="text-xs text-slate-400 font-semibold">
                    Base ${settings.weeklyBaseRate} + ${(settings.pointsToDollar * 100).toFixed(0)}¢/10pts
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Allowance settings per kid */}
      <div>
        <h2 className="text-lg font-black text-slate-700 mb-3">Allowance Settings</h2>
        <div className="space-y-3">
          {members.map((member) => {
            const s = settingsForm[member.id] ?? { base: 0, rate: 0.10 };
            return (
              <div key={member.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
                <span className="text-3xl">{member.avatar}</span>
                <span className="font-black text-slate-800 w-24">{member.name}</span>
                <div className="flex items-center gap-2 flex-1 flex-wrap">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-500">Base $/week</span>
                    <input
                      type="number"
                      step="0.50"
                      min="0"
                      value={s.base}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, [member.id]: { ...s, base: parseFloat(e.target.value) || 0 } }))
                      }
                      className="w-20 rounded-xl border border-slate-200 px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-500">$/10 pts</span>
                    <input
                      type="number"
                      step="0.05"
                      min="0"
                      value={(s.rate * 10).toFixed(2)}
                      onChange={(e) =>
                        setSettingsForm((p) => ({ ...p, [member.id]: { ...s, rate: parseFloat(e.target.value) / 10 || 0 } }))
                      }
                      className="w-20 rounded-xl border border-slate-200 px-2 py-1 text-sm font-bold text-center focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    />
                  </div>
                </div>
                <button
                  onClick={() => saveSettings(member.id)}
                  className="bg-emerald-500 text-white rounded-xl px-3 py-1.5 text-sm font-bold hover:bg-emerald-600 transition-colors"
                >
                  Save
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* History */}
      {allowances.filter((a) => a.weekStart.split("T")[0] !== thisWeek).length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-black text-slate-700 mb-3">History</h2>
          <div className="space-y-2">
            {allowances
              .filter((a) => a.weekStart.split("T")[0] !== thisWeek)
              .map((a) => (
                <div key={a.id} className="bg-white rounded-2xl p-3 shadow-sm flex items-center gap-3">
                  <span className="text-2xl">{a.member.avatar}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-800 text-sm">{a.member.name}</p>
                    <p className="text-xs text-slate-400">
                      Week of {new Date(a.weekStart).toLocaleDateString()} • {a.pointsEarned} pts
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-slate-800">{formatCurrency(a.amountEarned)}</p>
                    <p className={`text-xs font-bold ${a.paidOut ? "text-emerald-500" : "text-orange-500"}`}>
                      {a.paidOut ? "Paid ✓" : "Pending"}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
