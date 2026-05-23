"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Settings, Trophy, Calendar, Star } from "lucide-react";
import { getLevelFromPoints, getLevelTitle, getPointsForNextLevel } from "@/lib/points";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface Assignment {
  id: number;
  completions: { id: number }[];
}

interface Member {
  id: number;
  name: string;
  age: number;
  role: string;
  avatar: string;
  color: string;
  totalPoints: number;
  level: number;
  assignments: Assignment[];
}

export default function FamilyDashboard() {
  const [members, setMembers] = useState<Member[]>([]);
  const [tvMode, setTvMode] = useState(false);

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/members");
    const data = await res.json();
    setMembers(data);
  }, []);

  useEffect(() => {
    loadMembers();
    const params = new URLSearchParams(window.location.search);
    setTvMode(params.get("mode") === "tv");
  }, [loadMembers]);

  useEffect(() => {
    if (!tvMode) return;
    const interval = setInterval(loadMembers, 60000);
    return () => clearInterval(interval);
  }, [tvMode, loadMembers]);

  const kids = members.filter((m) => m.role === "child");
  const sorted = [...kids].sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className={`min-h-screen ${tvMode ? "p-12" : "p-6"}`}>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className={`font-black text-slate-800 ${tvMode ? "text-6xl" : "text-4xl"}`}>
            🏠 ChoresList
          </h1>
          <p className="text-slate-500 font-semibold mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {!tvMode && (
          <div className="flex gap-3">
            <Link
              href="/calendar"
              className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow"
            >
              <Calendar size={18} /> Calendar
            </Link>
            <Link
              href="/parent"
              className="flex items-center gap-2 bg-white rounded-2xl px-4 py-2.5 shadow-sm font-bold text-slate-600 hover:shadow-md transition-shadow"
            >
              <Settings size={18} /> Parent Panel
            </Link>
          </div>
        )}
      </div>

      {kids.length === 0 && (
        <div className="text-center py-24">
          <div className="text-8xl mb-6">👨‍👩‍👧‍👦</div>
          <h2 className="text-2xl font-bold text-slate-700 mb-2">No family members yet</h2>
          <p className="text-slate-500 mb-6">Head to the Parent Panel to add your kids!</p>
          <Link
            href="/parent"
            className="bg-violet-500 text-white px-6 py-3 rounded-2xl font-bold hover:bg-violet-600 transition-colors"
          >
            Set Up Family
          </Link>
        </div>
      )}

      {sorted.length > 1 && (
        <div className="mb-8 bg-white/70 backdrop-blur rounded-3xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={18} className="text-yellow-500" />
            <span className="font-bold text-slate-700">This Week&apos;s Leaderboard</span>
          </div>
          <div className="flex gap-6 overflow-x-auto">
            {sorted.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 shrink-0">
                <span className="text-lg font-black text-slate-400">#{i + 1}</span>
                <span className="text-2xl">{m.avatar}</span>
                <div>
                  <p className="font-bold text-slate-700 text-sm">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.totalPoints} pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`grid gap-6 ${
          tvMode
            ? "grid-cols-2 gap-10"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        }`}
      >
        {kids.map((member, i) => {
          const progress = getPointsForNextLevel(member.totalPoints);
          const todayDone = member.assignments.filter((a) => a.completions.length > 0).length;
          const todayTotal = member.assignments.length;
          const allDone = todayTotal > 0 && todayDone === todayTotal;

          return (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Link href={`/kid/${member.id}`}>
                <div
                  className="rounded-3xl p-6 shadow-md hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer relative overflow-hidden"
                  style={{
                    backgroundColor: member.color + "22",
                    border: `2px solid ${member.color}55`,
                  }}
                >
                  {allDone && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-emerald-400 text-white font-bold text-xs">All Done! ✓</Badge>
                    </div>
                  )}
                  <div className={`text-center mb-4 ${tvMode ? "text-8xl" : "text-6xl"}`}>
                    {member.avatar}
                  </div>
                  <h2 className={`font-black text-slate-800 text-center mb-1 ${tvMode ? "text-4xl" : "text-2xl"}`}>
                    {member.name}
                  </h2>
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Badge style={{ backgroundColor: member.color }} className="text-white font-bold text-xs">
                      Lv.{getLevelFromPoints(member.totalPoints)}{" "}
                      {getLevelTitle(getLevelFromPoints(member.totalPoints))}
                    </Badge>
                    <span className="flex items-center gap-1 text-slate-600 font-semibold text-sm">
                      <Star size={14} className="text-yellow-500" fill="currentColor" />
                      {member.totalPoints}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 mb-1">
                      <span>Level progress</span>
                      <span>{progress.current}/{progress.next} XP</span>
                    </div>
                    <Progress value={progress.progress} className="h-2" />
                  </div>
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-500">Today</span>
                    <span style={{ color: allDone ? "#10b981" : "#6366f1" }}>
                      {todayDone}/{todayTotal} chores ✓
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {tvMode && (
        <p className="text-center text-slate-400 mt-12 font-semibold">
          Tap a card to see your chores • Auto-refreshes every minute
        </p>
      )}
    </div>
  );
}
