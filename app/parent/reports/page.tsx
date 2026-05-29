"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, TrendingUp, CheckCircle2, Star, Users } from "lucide-react";
import Link from "next/link";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { CHORE_CATEGORIES } from "@/types";

interface MemberStat {
  id: number;
  name: string;
  avatar: string;
  color: string;
  role: string;
  totalPoints: number;
  level: number;
  completionCount: number;
  pointsInRange: number;
  assignmentCount: number;
}

interface ReportData {
  members: MemberStat[];
  weekly: Record<string, number | string>[];
  weeklyCompletions: Record<string, number | string>[];
  topChores: { name: string; icon: string; count: number; points: number }[];
  byCategory: { category: string; count: number; points: number }[];
  totalCompletions: number;
  totalPoints: number;
}

const RANGE_OPTIONS = [
  { value: "week", label: "This Week" },
  { value: "month", label: "Last 4 Weeks" },
  { value: "all", label: "Last 3 Months" },
];

const CATEGORY_COLORS: Record<string, string> = {
  cleaning: "#60a5fa",
  outdoor: "#34d399",
  pets: "#f97316",
  kitchen: "#fbbf24",
  laundry: "#a78bfa",
  other: "#94a3b8",
};

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [range, setRange] = useState("month");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports?range=${range}`);
    setData(await res.json());
    setLoading(false);
  }, [range]);

  useEffect(() => { load(); }, [load]);

  const kids = data?.members.filter((m) => m.role === "child") ?? [];
  const memberNames = kids.map((m) => m.name);

  const topMember = kids.length > 0
    ? kids.reduce((best, m) => m.pointsInRange > best.pointsInRange ? m : best, kids[0])
    : null;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">📊 Reports</h1>
        <div className="grid grid-cols-3 gap-2 sm:flex">
          {RANGE_OPTIONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`px-4 py-2 rounded-xl font-bold text-sm transition-colors ${
                range === r.value ? "bg-violet-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="text-slate-400 font-bold animate-pulse text-lg">Loading report...</div>
        </div>
      ) : !data ? null : (
        <div className="space-y-8">
          {/* Stat cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<CheckCircle2 size={22} className="text-emerald-500" />}
              bg="bg-emerald-50"
              label="Tasks Completed"
              value={data.totalCompletions.toString()}
            />
            <StatCard
              icon={<Star size={22} className="text-amber-500" />}
              bg="bg-amber-50"
              label="Points Earned"
              value={data.totalPoints.toLocaleString()}
            />
            <StatCard
              icon={<Users size={22} className="text-violet-500" />}
              bg="bg-violet-50"
              label="Active Kids"
              value={kids.length.toString()}
            />
            <StatCard
              icon={<TrendingUp size={22} className="text-blue-500" />}
              bg="bg-blue-50"
              label="Top Earner"
              value={topMember ? `${topMember.avatar} ${topMember.name}` : "—"}
            />
          </div>

          {/* Member comparison */}
          {kids.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-800 mb-4">Points Earned by Member</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={kids.map((m) => ({ name: `${m.avatar} ${m.name}`, points: m.pointsInRange, tasks: m.completionCount, color: m.color }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontWeight: 700, fontSize: 13 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(val, name) => [val, name === "points" ? "Points" : "Tasks"]}
                    contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }}
                  />
                  <Legend />
                  <Bar dataKey="points" name="Points" radius={[6, 6, 0, 0]}>
                    {kids.map((m) => (
                      <Cell key={m.id} fill={m.color} />
                    ))}
                  </Bar>
                  <Bar dataKey="tasks" name="Tasks" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Weekly points chart */}
            {data.weekly.length > 0 && memberNames.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 mb-4">Weekly Points Trend</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.weekly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Legend />
                    {kids.map((m) => (
                      <Bar key={m.id} dataKey={m.name} fill={m.color} stackId="a" radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Weekly completions chart */}
            {data.weeklyCompletions.length > 0 && memberNames.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 mb-4">Weekly Tasks Completed</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.weeklyCompletions}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="week" tick={{ fontSize: 12, fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.1)" }} />
                    <Legend />
                    {kids.map((m) => (
                      <Bar key={m.id} dataKey={m.name} fill={m.color} stackId="a" radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Top chores */}
            {data.topChores.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 mb-4">Most Completed Chores</h2>
                <div className="space-y-3">
                  {data.topChores.map((c, i) => (
                    <div key={c.name} className="flex items-center gap-3">
                      <span className="font-black text-slate-300 w-5 text-sm">{i + 1}</span>
                      <span className="text-xl">{c.icon}</span>
                      <span className="flex-1 font-bold text-slate-700 text-sm">{c.name}</span>
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">{c.count}×</span>
                      <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">⭐ {c.points}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Category breakdown */}
            {data.byCategory.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm">
                <h2 className="text-lg font-black text-slate-800 mb-4">By Category</h2>
                <div className="flex gap-4">
                  <ResponsiveContainer width="50%" height={180}>
                    <PieChart>
                      <Pie data={data.byCategory} dataKey="count" nameKey="category" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                        {data.byCategory.map((entry) => (
                          <Cell key={entry.category} fill={CATEGORY_COLORS[entry.category] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [val, name]} contentStyle={{ borderRadius: 12, border: "none" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2 self-center">
                    {data.byCategory.map((c) => {
                      const meta = CHORE_CATEGORIES.find((cat) => cat.value === c.category);
                      return (
                        <div key={c.category} className="flex items-center gap-2 text-sm">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CATEGORY_COLORS[c.category] ?? "#94a3b8" }} />
                          <span className="font-semibold text-slate-600 flex-1">{meta?.icon} {meta?.label ?? c.category}</span>
                          <span className="font-black text-slate-700">{c.count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Member assignment table */}
          {data.members.length > 0 && (
            <div className="bg-white rounded-3xl p-6 shadow-sm">
              <h2 className="text-lg font-black text-slate-800 mb-4">Member Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-400 font-bold border-b border-slate-100">
                      <th className="pb-3 pr-4">Member</th>
                      <th className="pb-3 pr-4 text-right">Assigned</th>
                      <th className="pb-3 pr-4 text-right">Completed</th>
                      <th className="pb-3 pr-4 text-right">Pts (period)</th>
                      <th className="pb-3 text-right">Total Pts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((m) => (
                      <tr key={m.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{m.avatar}</span>
                            <div>
                              <p className="font-black text-slate-800">{m.name}</p>
                              <p className="text-xs text-slate-400 capitalize">Lv.{m.level} {m.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-right font-bold text-slate-600">{m.assignmentCount}</td>
                        <td className="py-3 pr-4 text-right font-bold text-emerald-600">{m.completionCount}</td>
                        <td className="py-3 pr-4 text-right font-bold text-violet-600">+{m.pointsInRange}</td>
                        <td className="py-3 text-right font-black text-slate-800">{m.totalPoints.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {data.totalCompletions === 0 && (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📋</div>
              <h2 className="text-xl font-bold text-slate-600">No completed tasks yet</h2>
              <p className="text-slate-400 mt-1">Data will appear here once kids start checking off chores.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: string }) {
  return (
    <div className={`rounded-3xl p-5 ${bg} shadow-sm`}>
      <div className="flex items-center gap-3 mb-2">{icon}<span className="text-sm font-bold text-slate-500">{label}</span></div>
      <p className="text-2xl font-black text-slate-800">{value}</p>
    </div>
  );
}
