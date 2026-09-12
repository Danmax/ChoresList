"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, Search, Trash2, Gift } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WISH_CATEGORIES } from "@/types";
import { amazonSearchUrl } from "@/lib/amazon";
import { Input } from "@/components/ui/input";

interface Member { id: string; name: string; avatar: string; color: string }

interface WishItem {
  id: string;
  memberId: string;
  title: string;
  category: string;
  emoji: string;
  note: string | null;
  amazonUrl: string | null;
  status: string;
  createdAt: string;
  member: Member;
}

export default function ParentWishlistPage() {
  const [items, setItems] = useState<WishItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [amazonQuery, setAmazonQuery] = useState("");

  const load = useCallback(async () => {
    const [wRes, mRes] = await Promise.all([
      fetch("/api/wishlist"),
      fetch("/api/members"),
    ]);
    if (wRes.ok) setItems(await wRes.json());
    if (mRes.ok) {
      const data = await mRes.json().catch(() => []);
      setMembers(Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : []);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function grant(id: string) {
    await fetch("/api/wishlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "granted" }),
    });
    toast.success("Wish granted! 🎉");
    load();
  }

  async function ungrant(id: string) {
    await fetch("/api/wishlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "pending" }),
    });
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this wish?")) return;
    await fetch(`/api/wishlist?id=${id}`, { method: "DELETE" });
    toast.success("Wish removed");
    load();
  }

  function searchAmazon() {
    const url = amazonSearchUrl(amazonQuery);
    if (!url) { toast.error("Enter an item to search for"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  const filtered = items.filter((i) => {
    if (filter && i.memberId !== filter) return false;
    if (catFilter && i.category !== catFilter) return false;
    return true;
  });

  const pending = filtered.filter((i) => i.status === "pending");
  const granted = filtered.filter((i) => i.status === "granted");

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">🎄 Kids&apos; Christmas Lists</h1>
        <div className="text-sm font-bold text-slate-400">{pending.length} pending</div>
      </div>

      <form
        onSubmit={(event) => { event.preventDefault(); searchAmazon(); }}
        className="mb-6 flex flex-col gap-2 rounded-3xl border-2 border-amber-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
      >
        <div className="flex-1">
          <p className="font-black text-slate-700">Search Amazon</p>
          <p className="text-xs font-semibold text-slate-400">Look up a gift idea in a new tab.</p>
        </div>
        <Input
          value={amazonQuery}
          onChange={(event) => setAmazonQuery(event.target.value)}
          placeholder="LEGO set, headphones, books..."
          aria-label="Amazon item search"
          className="rounded-xl sm:max-w-xs"
        />
        <button
          type="submit"
          className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 font-black text-white transition-colors hover:bg-amber-600"
        >
          <Search size={16} /> Search <ExternalLink size={13} />
        </button>
      </form>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button
          onClick={() => setFilter("")}
          className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${!filter ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
        >
          All Kids
        </button>
        {members.filter((m) => m).map((m) => (
          <button
            key={m.id}
            onClick={() => setFilter(filter === String(m.id) ? "" : String(m.id))}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-1 ${filter === String(m.id) ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
          >
            {m.avatar} {m.name}
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap mb-6">
        <button
          onClick={() => setCatFilter("")}
          className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${!catFilter ? "bg-violet-500 text-white" : "bg-white text-slate-500"}`}
        >All</button>
        {WISH_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setCatFilter(catFilter === c.value ? "" : c.value)}
            className={`px-3 py-1.5 rounded-full font-bold text-xs transition-colors ${catFilter === c.value ? "text-white" : "bg-white text-slate-500"}`}
            style={catFilter === c.value ? { backgroundColor: c.color } : {}}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {/* Pending wishes */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-base font-black text-slate-700 mb-3 flex items-center gap-2">
            <Gift size={18} className="text-violet-500" /> Pending Wishes
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item) => {
              const cat = WISH_CATEGORIES.find((c) => c.value === item.category);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-4 shadow-sm"
                  style={{ border: `2px solid ${cat?.color ?? "#e2e8f0"}33` }}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-4xl shrink-0">{item.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-800 text-sm">{item.member.avatar} {item.member.name}</p>
                      <p className="font-bold text-slate-700 text-base mt-0.5">{item.title}</p>
                      {item.note && <p className="text-slate-400 text-sm mt-1 leading-snug">{item.note}</p>}
                      <span
                        className="inline-block mt-1.5 text-xs font-black px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cat?.bg, color: cat?.color }}
                      >
                        {cat?.emoji} {cat?.label}
                      </span>
                      <a
                        href={item.amazonUrl ?? amazonSearchUrl(item.title)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 flex w-fit items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-700"
                      >
                        <Search size={12} /> {item.amazonUrl ? "View exact item" : "Search this gift"} <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => grant(item.id)}
                      className="flex-1 flex items-center justify-center gap-1.5 bg-emerald-500 text-white rounded-xl py-2 font-black text-sm hover:bg-emerald-600 transition-colors"
                    >
                      <CheckCircle2 size={15} /> Grant It! 🎉
                    </button>
                    <button
                      onClick={() => remove(item.id)}
                      className="p-2 text-red-300 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Granted */}
      {granted.length > 0 && (
        <div>
          <h2 className="text-base font-black text-slate-700 mb-3">✅ Granted</h2>
          <div className="space-y-2">
            {granted.map((item) => (
              <div key={item.id} className="bg-slate-50 rounded-2xl p-3 flex items-center gap-3 opacity-70">
                <span className="text-2xl grayscale">{item.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400">{item.member.avatar} {item.member.name}</p>
                  <p className="font-bold text-slate-500 line-through text-sm">{item.title}</p>
                </div>
                <button
                  onClick={() => ungrant(item.id)}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-200"
                >
                  Undo
                </button>
                <button
                  onClick={() => remove(item.id)}
                  className="text-red-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🎁</div>
          <h2 className="text-xl font-bold text-slate-600">No Christmas wishes yet</h2>
          <p className="text-slate-400 mt-1">Kids can build their Christmas list from their chore page.</p>
        </div>
      )}
    </div>
  );
}
