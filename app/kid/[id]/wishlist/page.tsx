"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Plus, Search, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WISH_CATEGORIES, WISH_EMOJIS } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { amazonSearchUrl } from "@/lib/amazon";

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
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
}

export default function KidWishlistPage() {
  const { id } = useParams<{ id: string }>();
  const memberId = id;

  const [member, setMember] = useState<Member | null>(null);
  const [items, setItems] = useState<WishItem[]>([]);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"category" | "details">("category");
  const [form, setForm] = useState({ title: "", category: "toy", emoji: "🎮", note: "", amazonUrl: "" });

  const load = useCallback(async () => {
    const [mRes, wRes] = await Promise.all([
      fetch("/api/members"),
      fetch(`/api/wishlist?memberId=${memberId}`),
    ]);
    if (mRes.ok) {
      const data = await mRes.json();
      const members: Member[] = Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : [];
      setMember(members.find((m) => m.id === memberId) ?? null);
    }
    if (wRes.ok) setItems(await wRes.json());
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setForm({ title: "", category: "toy", emoji: "🎮", note: "", amazonUrl: "" });
    setStep("category");
    setOpen(true);
  }

  function selectCategory(cat: typeof WISH_CATEGORIES[number]) {
    setForm((p) => ({ ...p, category: cat.value, emoji: WISH_EMOJIS[cat.value]?.[0] ?? cat.emoji }));
    setStep("details");
  }

  async function submit() {
    if (!form.title.trim()) { toast.error("Tell us what you want!"); return; }
    const res = await fetch("/api/wishlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, ...form }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not add this gift"); return; }
    toast.success("Added to your Christmas list! 🎄");
    setOpen(false);
    load();
  }

  function searchAmazon() {
    const url = amazonSearchUrl(form.title);
    if (!url) { toast.error("Type a gift idea first"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function remove(itemId: string) {
    await fetch(`/api/wishlist?id=${itemId}`, { method: "DELETE" });
    load();
  }

  const pending = items.filter((i) => i.status === "pending");
  const granted = items.filter((i) => i.status === "granted");

  return (
    <div className="min-h-screen p-4 sm:p-6" style={{ background: member ? `${member.color}15` : "#f8fafc" }}>
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link
          href={`/kid/${id}`}
          className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">
          🎄 {member?.name}&apos;s Christmas List
        </h1>
        <button
          onClick={openAdd}
          className="flex items-center justify-center gap-2 text-white rounded-2xl px-4 py-2.5 font-bold shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: member?.color ?? "#a78bfa" }}
        >
          <Plus size={18} /> Add a Gift
        </button>
      </div>

      {/* Pending wishes */}
      {pending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-black text-slate-700 mb-3">✨ My Wishes ({pending.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence>
              {pending.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="bg-white rounded-3xl p-4 shadow-sm"
                  style={{ border: `2px solid ${getCategoryColor(item.category)}33` }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-4xl shrink-0">{item.emoji}</span>
                      <div className="min-w-0">
                        <p className="font-black text-slate-800 text-base leading-tight">{item.title}</p>
                        {item.note && <p className="text-slate-400 text-sm mt-1 leading-snug">{item.note}</p>}
                        <CategoryBadge category={item.category} />
                        <a
                          href={item.amazonUrl ?? amazonSearchUrl(item.title)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-2 flex w-fit items-center gap-1 text-xs font-black text-amber-600 hover:text-amber-700"
                        >
                          <Search size={12} /> {item.amazonUrl ? "View on Amazon" : "Find on Amazon"} <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => remove(item.id)}
                      className="text-slate-300 hover:text-red-400 transition-colors shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Granted wishes */}
      {granted.length > 0 && (
        <div>
          <h2 className="text-lg font-black text-slate-700 mb-3">🎉 Got it! ({granted.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {granted.map((item) => (
              <div
                key={item.id}
                className="bg-slate-50 rounded-3xl p-4 opacity-70 border-2 border-slate-100"
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl grayscale">{item.emoji}</span>
                  <div>
                    <p className="font-bold text-slate-500 line-through">{item.title}</p>
                    <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">✅ Granted!</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🌟</div>
          <h2 className="text-2xl font-black text-slate-600">Your Christmas list is empty!</h2>
          <p className="text-slate-400 mt-2 font-semibold">Tap &ldquo;Add a Gift&rdquo; to share something you would love.</p>
        </div>
      )}

      {/* Add Christmas Gift Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-center text-xl">
              {step === "category" ? "What would you love for Christmas? 🎄" : "Tell us more! ✏️"}
            </DialogTitle>
          </DialogHeader>

          {step === "category" ? (
            <div className="grid grid-cols-1 gap-3 pt-2">
              {WISH_CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => selectCategory(cat)}
                  className="flex items-center gap-4 rounded-2xl p-4 font-bold text-left transition-all hover:scale-105 active:scale-95"
                  style={{ backgroundColor: cat.bg, border: `2px solid ${cat.color}44` }}
                >
                  <span className="text-3xl">{cat.emoji}</span>
                  <span className="text-lg font-black text-slate-700">{cat.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <div>
                <Label className="font-bold text-slate-600">Pick an emoji</Label>
                <div className="flex flex-wrap gap-1.5 mt-2 p-2 bg-slate-50 rounded-2xl max-h-28 overflow-y-auto">
                  {(WISH_EMOJIS[form.category] ?? []).map((e) => (
                    <button
                      key={e}
                      onClick={() => setForm((p) => ({ ...p, emoji: e }))}
                      className={`text-2xl p-1.5 rounded-xl transition-all ${form.emoji === e ? "bg-white ring-2 ring-violet-400 scale-110" : "hover:bg-white"}`}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="font-bold text-slate-600">I want...</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. LEGO Star Wars set"
                  className="rounded-xl mt-1 text-lg font-bold"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={searchAmazon}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 py-2.5 text-sm font-black text-amber-700 transition-colors hover:bg-amber-100"
                >
                  <Search size={16} /> Search Amazon for this gift <ExternalLink size={13} />
                </button>
              </div>
              <div>
                <Label className="font-bold text-slate-600">Amazon product link (optional)</Label>
                <Input
                  value={form.amazonUrl}
                  onChange={(e) => setForm((p) => ({ ...p, amazonUrl: e.target.value }))}
                  placeholder="Paste the Amazon item link here"
                  inputMode="url"
                  className="rounded-xl mt-1"
                />
                <p className="mt-1 text-xs font-semibold text-slate-400">Search Amazon, copy the product link, then paste it here so your parents see the exact one.</p>
              </div>
              <div>
                <Label className="font-bold text-slate-600">Why? (optional)</Label>
                <Input
                  value={form.note}
                  onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
                  placeholder="e.g. It's the one with the X-wing!"
                  className="rounded-xl mt-1"
                />
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setStep("category")}
                  className="flex-1 bg-slate-100 text-slate-600 rounded-xl py-3 font-bold hover:bg-slate-200 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={submit}
                  className="flex-2 flex-grow-[2] flex items-center justify-center gap-2 text-white rounded-xl py-3 font-black hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: getCategoryColor(form.category) }}
                >
                  <Sparkles size={16} /> Add to Christmas List!
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getCategoryColor(cat: string) {
  return WISH_CATEGORIES.find((c) => c.value === cat)?.color ?? "#a78bfa";
}

function CategoryBadge({ category }: { category: string }) {
  const meta = WISH_CATEGORIES.find((c) => c.value === category);
  if (!meta) return null;
  return (
    <span
      className="inline-block mt-1 text-xs font-black px-2 py-0.5 rounded-full"
      style={{ backgroundColor: meta.bg, color: meta.color }}
    >
      {meta.emoji} {meta.label}
    </span>
  );
}
