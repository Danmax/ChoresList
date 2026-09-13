"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Copy, ExternalLink, ListPlus, Plus, Search, Share2, Trash2, Gift } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WISH_CATEGORIES } from "@/types";
import { amazonSearchUrl } from "@/lib/amazon";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { canCreateBirthdayList, daysUntilBirthday, WISH_LIST_TYPE_META, type WishListType } from "@/lib/wishlists";

interface Member { id: string; name: string; avatar: string; color: string; birthdayMonth?: number | null; birthdayDay?: number | null }

interface GiftList {
  id: string; memberId: string; title: string; type: WishListType; publicToken: string | null;
  member: Member; _count: { items: number };
}

interface WishItem {
  id: string;
  memberId: string;
  listId: string;
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
  const [lists, setLists] = useState<GiftList[]>([]);
  const [activeListId, setActiveListId] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [filter, setFilter] = useState<string>("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [amazonQuery, setAmazonQuery] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [giftOpen, setGiftOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState({ publicUrl: "", embedHtml: "" });
  const [newList, setNewList] = useState<{ memberId: string; type: WishListType; title: string }>({ memberId: "", type: "general", title: "" });
  const [newGift, setNewGift] = useState({ title: "", amazonUrl: "", note: "" });

  const load = useCallback(async () => {
    const [wRes, mRes, lRes] = await Promise.all([
      fetch("/api/wishlist"),
      fetch("/api/members"),
      fetch("/api/wishlists"),
    ]);
    if (wRes.ok) setItems(await wRes.json());
    if (mRes.ok) {
      const data = await mRes.json().catch(() => []);
      setMembers(Array.isArray(data) ? data : Array.isArray(data?.members) ? data.members : []);
    }
    if (lRes.ok) {
      const nextLists: GiftList[] = await lRes.json();
      setLists(nextLists);
      setActiveListId((current) => nextLists.some((list) => list.id === current) ? current : nextLists[0]?.id ?? "");
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

  async function createList() {
    if (!newList.memberId) { toast.error("Choose a family member"); return; }
    const res = await fetch("/api/wishlists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newList, creatorType: "parent" }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not create list"); return; }
    setCreateOpen(false);
    await load();
    setActiveListId(data.id);
    setFilter(data.memberId);
    toast.success(`${data.title} created`);
  }

  async function addGift() {
    const active = lists.find((list) => list.id === activeListId);
    if (!active || !newGift.title.trim()) { toast.error("Add a gift name first"); return; }
    const res = await fetch("/api/wishlist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...newGift, memberId: active.memberId, listId: active.id, creatorType: "parent", category: "other", emoji: "🎁" }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not add gift"); return; }
    setGiftOpen(false);
    setNewGift({ title: "", amazonUrl: "", note: "" });
    load();
    toast.success("Gift added");
  }

  async function setSharing(enable: boolean) {
    const res = await fetch("/api/wishlists", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeListId, sharing: enable ? "enable" : "disable" }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not update sharing"); return; }
    await load();
    if (enable) {
      setShareData({ publicUrl: data.publicUrl, embedHtml: data.embedHtml });
      setShareOpen(true);
    } else {
      setShareOpen(false);
      toast.success("Public sharing turned off");
    }
  }

  async function copy(value: string, label: string) {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  }

  function selectMember(memberId: string) {
    const nextFilter = filter === memberId ? "" : memberId;
    setFilter(nextFilter);
    setActiveListId(lists.find((list) => !nextFilter || list.memberId === nextFilter)?.id ?? "");
  }

  const filtered = items.filter((i) => {
    if (activeListId && i.listId !== activeListId) return false;
    if (filter && i.memberId !== filter) return false;
    if (catFilter && i.category !== catFilter) return false;
    return true;
  });

  const pending = filtered.filter((i) => i.status === "pending");
  const granted = filtered.filter((i) => i.status === "granted");
  const activeList = lists.find((list) => list.id === activeListId);
  const selectedMember = members.find((member) => member.id === newList.memberId);
  const visibleLists = lists.filter((list) => !filter || list.memberId === filter);

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Link href="/parent" className="bg-white rounded-2xl p-2 shadow-sm hover:shadow-md transition-shadow">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-800 flex-1">🎁 Family Gift Lists</h1>
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
          onClick={() => { setFilter(""); setActiveListId(lists[0]?.id ?? ""); }}
          className={`px-4 py-2 rounded-full font-bold text-sm transition-colors ${!filter ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
        >
          All Kids
        </button>
        {members.filter((m) => m).map((m) => (
          <button
            key={m.id}
            onClick={() => selectMember(String(m.id))}
            className={`px-4 py-2 rounded-full font-bold text-sm transition-colors flex items-center gap-1 ${filter === String(m.id) ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}
          >
            {m.avatar} {m.name}
          </button>
        ))}
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        {visibleLists.map((list) => <button key={list.id} onClick={() => setActiveListId(list.id)} className={`rounded-2xl px-4 py-2 text-sm font-black ${activeListId === list.id ? "bg-slate-800 text-white" : "bg-white text-slate-600"}`}>
          {WISH_LIST_TYPE_META[list.type].emoji} {list.title} <span className="opacity-60">({list._count.items})</span>
        </button>)}
        <button onClick={() => { setNewList({ memberId: filter || members[0]?.id || "", type: "general", title: "" }); setCreateOpen(true); }} className="flex items-center gap-1.5 rounded-2xl border-2 border-dashed border-violet-200 px-4 py-2 text-sm font-black text-violet-600"><ListPlus size={16} /> New List</button>
      </div>

      {activeList && <div className="mb-6 flex flex-wrap items-center gap-2 rounded-3xl bg-white p-4 shadow-sm">
        <div className="mr-auto"><p className="font-black text-slate-800">{activeList.member.avatar} {activeList.title}</p><p className="text-xs font-semibold text-slate-400">{WISH_LIST_TYPE_META[activeList.type].label}</p></div>
        <button onClick={() => { setNewGift({ title: "", amazonUrl: "", note: "" }); setGiftOpen(true); }} className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white"><Plus size={15} /> Add Gift</button>
        <button onClick={() => activeList.publicToken ? setSharing(false) : setSharing(true)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black ${activeList.publicToken ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}><Share2 size={15} /> {activeList.publicToken ? "Stop Sharing" : "Share Publicly"}</button>
        {activeList.publicToken && <button onClick={() => setSharing(true)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Share Details</button>}
      </div>}
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
          <h2 className="text-xl font-bold text-slate-600">No gifts on this list yet</h2>
          <p className="text-slate-400 mt-1">Kids or parents can add the first gift idea.</p>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="font-black">Create a Gift List</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">Who is this for?</Label><select value={newList.memberId} onChange={(event) => setNewList((current) => ({ ...current, memberId: event.target.value }))} className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-bold">{members.map((member) => <option key={member.id} value={member.id}>{member.avatar} {member.name}</option>)}</select></div>
        <div className="grid gap-2">{(Object.entries(WISH_LIST_TYPE_META) as [WishListType, typeof WISH_LIST_TYPE_META[WishListType]][]).map(([type, meta]) => { const locked = type === "birthday" && !canCreateBirthdayList(selectedMember?.birthdayMonth, selectedMember?.birthdayDay); const days = daysUntilBirthday(selectedMember?.birthdayMonth, selectedMember?.birthdayDay); return <button key={type} disabled={locked} onClick={() => setNewList((current) => ({ ...current, type }))} className={`rounded-2xl border-2 p-3 text-left ${newList.type === type ? "border-violet-400 bg-violet-50" : "border-slate-100 bg-slate-50"} disabled:opacity-45`}><span className="font-black">{meta.emoji} {meta.label}</span><span className="block text-xs font-semibold text-slate-400">{locked ? (days === null ? "Add a birthday to the profile first" : `Opens in ${days - 42} days`) : meta.description}</span></button>; })}</div>
        <div><Label className="font-bold">List name (optional)</Label><Input value={newList.title} onChange={(event) => setNewList((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <button onClick={createList} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Create List</button>
      </div></DialogContent></Dialog>

      <Dialog open={giftOpen} onOpenChange={setGiftOpen}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="font-black">Add to {activeList?.title}</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">Gift idea</Label><Input value={newGift.title} onChange={(event) => setNewGift((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" placeholder="Gift name" /></div>
        <button onClick={() => { const url = amazonSearchUrl(newGift.title); if (url) window.open(url, "_blank", "noopener,noreferrer"); else toast.error("Add a gift name first"); }} className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-amber-200 bg-amber-50 py-2.5 font-black text-amber-700"><Search size={16} /> Search Amazon <ExternalLink size={13} /></button>
        <div><Label className="font-bold">Amazon link (optional)</Label><Input value={newGift.amazonUrl} onChange={(event) => setNewGift((current) => ({ ...current, amazonUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" /></div>
        <div><Label className="font-bold">Note (optional)</Label><Input value={newGift.note} onChange={(event) => setNewGift((current) => ({ ...current, note: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <button onClick={addGift} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Add Gift</button>
      </div></DialogContent></Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle className="font-black">Share This List</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">Public link</Label><div className="mt-1 flex gap-2"><Input readOnly value={shareData.publicUrl} className="rounded-xl" /><button onClick={() => copy(shareData.publicUrl, "Link")} className="rounded-xl bg-slate-800 p-3 text-white"><Copy size={17} /></button></div></div>
        <div><Label className="font-bold">Embed HTML</Label><textarea readOnly value={shareData.embedHtml} className="mt-1 min-h-28 w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xs text-slate-600" /><button onClick={() => copy(shareData.embedHtml, "Embed HTML")} className="mt-2 flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 font-black text-white"><Copy size={16} /> Copy Embed HTML</button></div>
        <p className="text-xs font-semibold text-slate-400">Anyone with the link or a site containing the embed can see the list. Granted gifts are hidden.</p>
      </div></DialogContent></Dialog>
    </div>
  );
}
