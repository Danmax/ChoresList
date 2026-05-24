"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface Member { id: number; name: string; avatar: string; color: string }
interface Project { id: number; title: string; emoji: string }
interface Ticket {
  id: number; memberId: number; rewardTitle: string; rewardEmoji: string;
  status: string; earnedAt: string; redeemedAt: string | null;
  member: Member; project: Project;
}

const CONFETTI = ["⭐","🌟","✨","🎉","🎊","💫","🎈","🎁","🏆","💎"];

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [celebrating, setCelebrating] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("");

  const load = useCallback(async () => {
    const res = await fetch("/api/tickets");
    if (res.ok) setTickets(await res.json());
  }, []);

  useEffect(() => { load(); }, [load]);

  async function redeem(ticket: Ticket) {
    setCelebrating(ticket.id);
    await fetch("/api/tickets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ticket.id, status: "redeemed" }),
    });
    setTimeout(() => {
      setCelebrating(null);
      toast.success(`${ticket.rewardEmoji} ${ticket.rewardTitle} — redeemed!`);
      load();
    }, 2500);
  }

  const members = Array.from(new Map(tickets.map((t) => [t.member.id, t.member])).values());
  const displayed = filter ? tickets.filter((t) => t.memberId === parseInt(filter)) : tickets;
  const pending = displayed.filter((t) => t.status === "pending");
  const redeemed = displayed.filter((t) => t.status === "redeemed");

  return (
    <div className="min-h-screen p-4 sm:p-6">
      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="relative">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 0.5 }}
                  animate={{ x: (Math.random() - 0.5) * 400, y: (Math.random() - 0.5) * 400, opacity: 0, scale: 1.5 }}
                  transition={{ duration: 1.5, delay: i * 0.05, ease: "easeOut" }}
                  className="absolute text-3xl pointer-events-none"
                  style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }}
                >
                  {CONFETTI[i % CONFETTI.length]}
                </motion.div>
              ))}
              <motion.div
                initial={{ scale: 0, rotate: -10 }} animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="bg-white rounded-3xl p-8 text-center shadow-2xl max-w-xs mx-4"
              >
                <div className="text-6xl mb-3">🎉</div>
                <h2 className="text-2xl font-black text-slate-800 mb-1">Reward Redeemed!</h2>
                <p className="text-slate-500 font-semibold">Enjoy your reward!</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-3 mb-6">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">🎫 Reward Tickets</h1>
        {pending.length > 0 && (
          <span className="bg-orange-500 text-white text-sm font-black px-3 py-1 rounded-full">
            {pending.length} pending
          </span>
        )}
      </div>

      {/* Member filter */}
      {members.length > 1 && (
        <div className="flex gap-2 flex-wrap mb-6">
          <button onClick={() => setFilter("")}
            className={`px-4 py-2 rounded-full font-bold text-sm ${!filter ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>
            Everyone
          </button>
          {members.map((m) => (
            <button key={m.id} onClick={() => setFilter(String(m.id))}
              className={`px-4 py-2 rounded-full font-bold text-sm flex items-center gap-1 ${filter === String(m.id) ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>
              {m.avatar} {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Pending tickets */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-black text-slate-700 mb-4">✨ Ready to Redeem</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((t) => (
              <TicketCard key={t.id} ticket={t} onRedeem={() => redeem(t)} />
            ))}
          </div>
        </div>
      )}

      {/* Redeemed */}
      {redeemed.length > 0 && (
        <div>
          <h2 className="text-base font-black text-slate-700 mb-3">✅ Redeemed</h2>
          <div className="space-y-2">
            {redeemed.map((t) => (
              <div key={t.id} className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3 opacity-60">
                <span className="text-2xl grayscale">{t.rewardEmoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400">{t.member.avatar} {t.member.name}</p>
                  <p className="font-bold text-slate-500 line-through text-sm">{t.rewardTitle}</p>
                  <p className="text-xs text-slate-400">{t.project.emoji} {t.project.title}</p>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✓ Redeemed</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tickets.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎫</div>
          <h2 className="text-xl font-bold text-slate-600">No reward tickets yet</h2>
          <p className="text-slate-400 mt-1">Tickets appear when family members complete house projects.</p>
          <Link href="/parent/projects"
            className="inline-flex items-center gap-2 mt-4 bg-orange-500 text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-orange-600 transition-colors">
            <Sparkles size={16} /> Create a Project
          </Link>
        </div>
      )}
    </div>
  );
}

function TicketCard({ ticket, onRedeem }: { ticket: Ticket; onRedeem: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl overflow-hidden shadow-lg"
      style={{ border: `2px solid ${ticket.member.color}44` }}
    >
      {/* Ticket header — gold gradient */}
      <div className="bg-gradient-to-r from-amber-400 to-orange-400 px-4 py-3 flex items-center justify-between">
        <span className="font-black text-white text-sm tracking-widest">🎫 REWARD TICKET</span>
        <span className="text-white/80 text-xs font-bold">{new Date(ticket.earnedAt).toLocaleDateString()}</span>
      </div>

      {/* Ticket body */}
      <div className="bg-white px-4 py-4 text-center">
        <p className="text-xs font-bold text-slate-400 mb-2">Earned by</p>
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="text-3xl">{ticket.member.avatar}</span>
          <span className="font-black text-slate-800 text-lg">{ticket.member.name}</span>
        </div>
        <div className="text-5xl mb-2">{ticket.rewardEmoji}</div>
        <h3 className="font-black text-slate-800 text-xl mb-1">{ticket.rewardTitle}</h3>
        <p className="text-xs text-slate-400 font-semibold">
          {ticket.project.emoji} {ticket.project.title}
        </p>
      </div>

      {/* Perforated divider */}
      <div className="bg-white px-4">
        <div className="border-t-2 border-dashed border-slate-200 relative">
          <div className="absolute -left-6 -top-3 w-5 h-5 rounded-full bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50" />
          <div className="absolute -right-6 -top-3 w-5 h-5 rounded-full bg-gradient-to-br from-violet-50 via-blue-50 to-emerald-50" />
        </div>
      </div>

      {/* Redeem button */}
      <div className="bg-white px-4 pb-4 pt-3">
        <button onClick={onRedeem}
          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl py-3 font-black text-base hover:opacity-90 transition-opacity flex items-center justify-center gap-2">
          <Sparkles size={18} /> Redeem Now!
        </button>
      </div>
    </motion.div>
  );
}
