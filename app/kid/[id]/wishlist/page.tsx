"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, ListPlus, Pencil, Plus, Search, Trash2, Sparkles } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WISH_CATEGORIES, WISH_EMOJIS } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { amazonSearchUrl, retailerForUrl } from "@/lib/amazon";
import { canCreateBirthdayList, daysUntilBirthday, WISH_LIST_TYPE_META, type WishListType } from "@/lib/wishlists";
import { AmazonProductSearch } from "@/components/amazon-product-search";

interface WishItem {
  id: string;
  memberId: string;
  title: string;
  category: string;
  emoji: string;
  note: string | null;
  amazonUrl: string | null;
  imageUrl: string | null;
  status: string;
  createdAt: string;
}

interface Member {
  id: string;
  name: string;
  avatar: string;
  color: string;
  birthdayMonth?: number | null;
  birthdayDay?: number | null;
}

interface GiftList {
  id: string;
  title: string;
  type: WishListType;
  _count: { items: number };
}

export default function KidWishlistPage() {
  const { id } = useParams<{ id: string }>();
  const memberId = id;

  const [member, setMember] = useState<Member | null>(null);
  const [items, setItems] = useState<WishItem[]>([]);
  const [lists, setLists] = useState<GiftList[]>([]);
  const [activeListId, setActiveListId] = useState("");
  const [open, setOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [newList, setNewList] = useState<{ type: WishListType; title: string }>({ type: "general", title: "" });
  const [editList, setEditList] = useState<{ type: WishListType; title: string }>({ type: "general", title: "" });
  const [step, setStep] = useState<"category" | "details">("category");
  const [form, setForm] = useState({ title: "", category: "toy", emoji: "🎮", note: "", amazonUrl: "", imageUrl: "" });
  const [editItem, setEditItem] = useState({ id: "", title: "", category: "other", emoji: "🎁", note: "", amazonUrl: "", imageUrl: "" });

  const load = useCallback(async () => {
    const [mRes, lRes] = await Promise.all([
      fetch("/api/members"),
      fetch(`/api/wishlists?memberId=${memberId}`),
    ]);
    if (mRes.ok) {
      const data = await mRes.json();
      const members: Member[] = Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : [];
      setMember(members.find((m) => m.id === memberId) ?? null);
    }
    if (lRes.ok) {
      const nextLists: GiftList[] = await lRes.json();
      setLists(nextLists);
      setActiveListId((current) => nextLists.some((list) => list.id === current) ? current : nextLists[0]?.id ?? "");
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  const loadItems = useCallback(async () => {
    if (!activeListId) { setItems([]); return; }
    const res = await fetch(`/api/wishlist?memberId=${memberId}&listId=${activeListId}`);
    setItems(res.ok ? await res.json() : []);
  }, [activeListId, memberId]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function openAdd() {
    setForm({ title: "", category: "toy", emoji: "🎮", note: "", amazonUrl: "", imageUrl: "" });
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
      body: JSON.stringify({ memberId, listId: activeListId, creatorType: "kid", ...form }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not add this gift"); return; }
    toast.success("Added to your list! 🎁");
    setOpen(false);
    await Promise.all([load(), loadItems()]);
  }

  async function createList() {
    const res = await fetch("/api/wishlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, creatorType: "kid", ...newList }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not create this list"); return; }
    setCreateOpen(false);
    setNewList({ type: "general", title: "" });
    await load();
    setActiveListId(data.id);
    toast.success(`${data.title} created!`);
  }

  async function saveListEdits() {
    if (!activeList || !editList.title.trim()) { toast.error("Add a list name"); return; }
    const res = await fetch("/api/wishlists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: activeList.id, editorType: "kid", ...editList }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not update this list"); return; }
    setEditOpen(false);
    await load();
    toast.success("List updated");
  }

  async function saveItemEdits() {
    const res = await fetch("/api/wishlist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editItem, editorType: "kid" }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not update this gift"); return; }
    setEditItemOpen(false);
    await loadItems();
    toast.success("Gift updated");
  }

  async function remove(itemId: string) {
    await fetch(`/api/wishlist?id=${itemId}`, { method: "DELETE" });
    await Promise.all([load(), loadItems()]);
  }

  const pending = items.filter((i) => i.status === "pending");
  const granted = items.filter((i) => i.status === "granted");
  const activeList = lists.find((list) => list.id === activeListId);
  const birthdayDays = daysUntilBirthday(member?.birthdayMonth, member?.birthdayDay);

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
          {activeList ? WISH_LIST_TYPE_META[activeList.type].emoji : "🎁"} {activeList?.title ?? `${member?.name}'s Gift Lists`}
        </h1>
        <button
          onClick={() => { if (activeList) { setEditList({ title: activeList.title, type: activeList.type }); setEditOpen(true); } }}
          disabled={!activeList}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-bold text-slate-600 shadow-sm hover:shadow-md disabled:opacity-40"
        >
          <Pencil size={17} /> Edit List
        </button>
        <button
          onClick={() => { setNewList({ type: "general", title: "" }); setCreateOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 font-bold text-slate-600 shadow-sm hover:shadow-md"
        >
          <ListPlus size={18} /> New List
        </button>
        <button
          onClick={openAdd}
          disabled={!activeList}
          className="flex items-center justify-center gap-2 text-white rounded-2xl px-4 py-2.5 font-bold shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: member?.color ?? "#a78bfa" }}
        >
          <Plus size={18} /> Add Gift
        </button>
      </div>

      {lists.length > 0 && <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
        {lists.map((list) => <button key={list.id} onClick={() => setActiveListId(list.id)} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black transition-colors ${activeListId === list.id ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>
          {WISH_LIST_TYPE_META[list.type].emoji} {list.title} <span className="opacity-60">({list._count.items})</span>
        </button>)}
      </div>}

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
                      {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-slate-50 object-contain p-1" /> : <span className="text-4xl shrink-0">{item.emoji}</span>}
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
                          <Search size={12} /> {item.amazonUrl ? `View on ${retailerForUrl(item.amazonUrl)}` : "Find on Amazon"} <ExternalLink size={11} />
                        </a>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2"><button onClick={() => { setEditItem({ id: item.id, title: item.title, category: item.category, emoji: item.emoji, note: item.note ?? "", amazonUrl: item.amazonUrl ?? "", imageUrl: item.imageUrl ?? "" }); setEditItemOpen(true); }} className="text-slate-300 transition-colors hover:text-violet-500"><Pencil size={14} /></button><button onClick={() => remove(item.id)} className="text-slate-300 transition-colors hover:text-red-400"><Trash2 size={14} /></button></div>
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
                  {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-14 w-14 rounded-xl object-contain grayscale" /> : <span className="text-3xl grayscale">{item.emoji}</span>}
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

      {activeList && items.length === 0 && (
        <div className="text-center py-20">
          <div className="text-7xl mb-4">🌟</div>
          <h2 className="text-2xl font-black text-slate-600">This list is empty!</h2>
          <p className="text-slate-400 mt-2 font-semibold">Tap &ldquo;Add a Gift&rdquo; to share something you would love.</p>
        </div>
      )}

      {lists.length === 0 && <div className="py-20 text-center">
        <div className="mb-4 text-7xl">🎁</div>
        <h2 className="text-2xl font-black text-slate-600">Create your first gift list</h2>
        <p className="mt-2 font-semibold text-slate-400">Make a wish list, Christmas list, or birthday list.</p>
        <button onClick={() => setCreateOpen(true)} className="mt-5 rounded-2xl bg-violet-500 px-5 py-3 font-black text-white"><ListPlus className="mr-2 inline" size={18} /> Create a List</button>
      </div>}

      {/* Add Gift Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-black text-center text-xl">
              {step === "category" ? `Add to ${activeList?.title ?? "your list"}` : "Tell us more! ✏️"}
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
              </div>
              <AmazonProductSearch initialQuery={form.title} onSelect={(product) => setForm((current) => ({ ...current, title: product.title, amazonUrl: product.url, imageUrl: product.imageUrl ?? "" }))} />
              <div>
                <Label className="font-bold text-slate-600">Amazon or Walmart product link (optional)</Label>
                <Input
                  value={form.amazonUrl}
                  onChange={(e) => setForm((p) => ({ ...p, amazonUrl: e.target.value }))}
                  placeholder="Paste the exact product link here"
                  inputMode="url"
                  className="rounded-xl mt-1"
                />
                <p className="mt-1 text-xs font-semibold text-slate-400">Search Amazon or Walmart, then paste the exact product link so your parents see the right one.</p>
              </div>
              <div><Label className="font-bold text-slate-600">Product image URL (optional)</Label><Input value={form.imageUrl} onChange={(event) => setForm((current) => ({ ...current, imageUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" />{form.imageUrl && <img src={form.imageUrl} alt="Gift preview" className="mt-2 h-20 w-20 rounded-xl object-contain" />}</div>
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
                  <Sparkles size={16} /> Add to List!
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle className="font-black text-center text-xl">Create a Gift List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              {(Object.entries(WISH_LIST_TYPE_META) as [WishListType, typeof WISH_LIST_TYPE_META[WishListType]][]).map(([type, meta]) => {
                const birthdayLocked = type === "birthday" && !canCreateBirthdayList(member?.birthdayMonth, member?.birthdayDay);
                return <button key={type} type="button" disabled={birthdayLocked} onClick={() => setNewList((current) => ({ ...current, type }))} className={`rounded-2xl border-2 p-3 text-left ${newList.type === type ? "border-violet-400 bg-violet-50" : "border-slate-100 bg-slate-50"} disabled:cursor-not-allowed disabled:opacity-45`}>
                  <span className="font-black text-slate-700">{meta.emoji} {meta.label}</span>
                  <span className="block text-xs font-semibold text-slate-400">{birthdayLocked ? (birthdayDays === null ? "Ask a parent to add your birthday" : `Opens in ${birthdayDays - 42} days`) : meta.description}</span>
                </button>;
              })}
            </div>
            <div><Label className="font-bold text-slate-600">List name (optional)</Label><Input value={newList.title} onChange={(event) => setNewList((current) => ({ ...current, title: event.target.value }))} placeholder={WISH_LIST_TYPE_META[newList.type].label} className="mt-1 rounded-xl" /></div>
            <button type="button" onClick={createList} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white hover:bg-violet-600"><ListPlus className="mr-2 inline" size={18} /> Create List</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader><DialogTitle className="text-center text-xl font-black">Edit Gift List</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label className="font-bold text-slate-600">List name</Label><Input value={editList.title} onChange={(event) => setEditList((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" /></div>
            <div className="grid gap-2">{(Object.entries(WISH_LIST_TYPE_META) as [WishListType, typeof WISH_LIST_TYPE_META[WishListType]][]).map(([type, meta]) => {
              const locked = type === "birthday" && activeList?.type !== "birthday" && !canCreateBirthdayList(member?.birthdayMonth, member?.birthdayDay);
              return <button key={type} type="button" disabled={locked} onClick={() => setEditList((current) => ({ ...current, type }))} className={`rounded-2xl border-2 p-3 text-left ${editList.type === type ? "border-violet-400 bg-violet-50" : "border-slate-100 bg-slate-50"} disabled:opacity-45`}><span className="font-black text-slate-700">{meta.emoji} {meta.label}</span><span className="block text-xs font-semibold text-slate-400">{locked ? "Available six weeks before your birthday" : meta.description}</span></button>;
            })}</div>
            <button type="button" onClick={saveListEdits} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Save Changes</button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}><DialogContent className="max-h-[90vh] max-w-sm overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="font-black">Edit Gift</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">Gift name</Label><Input value={editItem.title} onChange={(event) => setEditItem((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <AmazonProductSearch initialQuery={editItem.title} onSelect={(product) => setEditItem((current) => ({ ...current, title: product.title, amazonUrl: product.url, imageUrl: product.imageUrl ?? "" }))} />
        <div><Label className="font-bold">Category</Label><select value={editItem.category} onChange={(event) => { const category = WISH_CATEGORIES.find((entry) => entry.value === event.target.value); setEditItem((current) => ({ ...current, category: event.target.value, emoji: category?.emoji ?? current.emoji })); }} className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-bold">{WISH_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}</select></div>
        <div><Label className="font-bold">Note</Label><Input value={editItem.note} onChange={(event) => setEditItem((current) => ({ ...current, note: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <div><Label className="font-bold">Amazon or Walmart product link</Label><Input value={editItem.amazonUrl} onChange={(event) => setEditItem((current) => ({ ...current, amazonUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" /></div>
        <div><Label className="font-bold">Product image URL</Label><Input value={editItem.imageUrl} onChange={(event) => setEditItem((current) => ({ ...current, imageUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" />{editItem.imageUrl && <img src={editItem.imageUrl} alt="Gift preview" className="mt-2 h-20 w-20 rounded-xl object-contain" />}</div>
        <button onClick={saveItemEdits} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Save Gift</button>
      </div></DialogContent></Dialog>
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
