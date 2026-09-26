"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, CheckCircle2, Copy, DollarSign, ExternalLink, ListPlus, PackageCheck, Pencil, Plus, Search, Share2, ShoppingCart, Trash2, Gift } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { WISH_CATEGORIES } from "@/types";
import { amazonSearchUrl, retailerForUrl } from "@/lib/amazon";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { canCreateBirthdayList, daysUntilBirthday, GIFT_PURCHASE_STATUSES, GIFT_PURCHASE_STATUS_META, WISH_LIST_TYPE_META, type GiftPurchaseStatus, type WishListType } from "@/lib/wishlists";
import { AmazonProductSearch } from "@/components/amazon-product-search";

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
  imageUrl: string | null;
  status: string;
  purchaseStatus: GiftPurchaseStatus;
  estimatedCostCents: number | null;
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
  const [editOpen, setEditOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareData, setShareData] = useState({ publicUrl: "", embedHtml: "" });
  const [newList, setNewList] = useState<{ memberId: string; type: WishListType; title: string }>({ memberId: "", type: "general", title: "" });
  const [newGift, setNewGift] = useState({ title: "", amazonUrl: "", imageUrl: "", note: "", estimatedCost: "" });
  const [editList, setEditList] = useState<{ title: string; type: WishListType }>({ title: "", type: "general" });
  const [editItem, setEditItem] = useState({ id: "", title: "", category: "other", emoji: "🎁", note: "", amazonUrl: "", imageUrl: "", estimatedCost: "" });

  const load = useCallback(async () => {
    const [wRes, mRes, lRes] = await Promise.all([
      fetch("/api/wishlist?parentTools=1"),
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

  function estimateFromPrice(price: string | null) {
    if (!price) return "";
    const amount = Number(price.replace(/[^0-9.]/g, ""));
    return Number.isFinite(amount) ? amount.toFixed(2) : "";
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
    setNewGift({ title: "", amazonUrl: "", imageUrl: "", note: "", estimatedCost: "" });
    load();
    toast.success("Gift added");
  }

  async function saveListEdits() {
    if (!activeList || !editList.title.trim()) { toast.error("Add a list name"); return; }
    const res = await fetch("/api/wishlists", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: activeList.id, editorType: "parent", ...editList }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not update list"); return; }
    setEditOpen(false);
    await load();
    toast.success("List updated");
  }

  async function saveItemEdits() {
    const res = await fetch("/api/wishlist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editItem, editorType: "parent" }) });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not update gift"); return; }
    setEditItemOpen(false);
    await load();
    toast.success("Gift updated");
  }

  async function updateParentTracking(id: string, purchaseStatus: GiftPurchaseStatus) {
    const res = await fetch("/api/wishlist", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, purchaseStatus }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) { toast.error(data?.error ?? "Could not update gift tracking"); return; }
    setItems((current) => current.map((item) => item.id === id ? { ...item, purchaseStatus } : item));
    toast.success(GIFT_PURCHASE_STATUS_META[purchaseStatus].label);
  }

  function openGiftEditor(item: WishItem) {
    setEditItem({
      id: item.id,
      title: item.title,
      category: item.category,
      emoji: item.emoji,
      note: item.note ?? "",
      amazonUrl: item.amazonUrl ?? "",
      imageUrl: item.imageUrl ?? "",
      estimatedCost: item.estimatedCostCents === null ? "" : (item.estimatedCostCents / 100).toFixed(2),
    });
    setEditItemOpen(true);
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
  const orderedCount = filtered.filter((item) => item.purchaseStatus === "ordered").length;
  const obtainedCount = filtered.filter((item) => item.purchaseStatus === "obtained").length;
  const estimatedTotal = filtered.reduce((total, item) => total + (item.estimatedCostCents ?? 0), 0);
  const formatCost = (cents: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(cents / 100);

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
          Everyone
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
        <button onClick={() => { setEditList({ title: activeList.title, type: activeList.type }); setEditOpen(true); }} className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600"><Pencil size={15} /> Edit List</button>
        <button onClick={() => { setNewGift({ title: "", amazonUrl: "", imageUrl: "", note: "", estimatedCost: "" }); setGiftOpen(true); }} className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-2 text-sm font-black text-white"><Plus size={15} /> Add Gift</button>
        <button onClick={() => activeList.publicToken ? setSharing(false) : setSharing(true)} className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black ${activeList.publicToken ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-700"}`}><Share2 size={15} /> {activeList.publicToken ? "Stop Sharing" : "Share Publicly"}</button>
        {activeList.publicToken && <button onClick={() => setSharing(true)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600">Share Details</button>}
      </div>}
      {activeList && <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400"><DollarSign size={15} className="text-violet-500" /> Estimated total</p><p className="mt-1 text-2xl font-black text-slate-800">{formatCost(estimatedTotal)}</p></div>
        <div className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400"><ShoppingCart size={15} className="text-amber-500" /> Ordered</p><p className="mt-1 text-2xl font-black text-slate-800">{orderedCount}</p></div>
        <div className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400"><PackageCheck size={15} className="text-emerald-500" /> Ready to give</p><p className="mt-1 text-2xl font-black text-slate-800">{obtainedCount}</p></div>
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
                    {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-slate-50 object-contain p-1" /> : <span className="text-4xl shrink-0">{item.emoji}</span>}
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
                        <Search size={12} /> {item.amazonUrl ? `View on ${retailerForUrl(item.amazonUrl)}` : "Search this gift"} <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                  <div className="mt-3 rounded-2xl bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-[11px] font-black uppercase tracking-wide text-slate-400">Private parent tracking</p>
                      <button onClick={() => openGiftEditor(item)} className="flex items-center gap-1 text-xs font-black text-violet-600"><DollarSign size={12} /> {item.estimatedCostCents === null ? "Add estimate" : formatCost(item.estimatedCostCents)}</button>
                    </div>
                    <div className="grid grid-cols-3 gap-1" role="group" aria-label={`Purchase status for ${item.title}`}>
                      {GIFT_PURCHASE_STATUSES.map((purchaseStatus) => {
                        const meta = GIFT_PURCHASE_STATUS_META[purchaseStatus];
                        const selected = item.purchaseStatus === purchaseStatus;
                        return <button key={purchaseStatus} onClick={() => updateParentTracking(item.id, purchaseStatus)} aria-pressed={selected} className={`rounded-lg px-1.5 py-2 text-[11px] font-black transition-colors ${selected ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-100"}`}><span className="block text-sm" aria-hidden="true">{meta.emoji}</span>{meta.shortLabel}</button>;
                      })}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => openGiftEditor(item)} className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 px-3 py-2 text-sm font-black text-slate-600"><Pencil size={14} /> Edit</button>
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
                {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-12 w-12 rounded-xl object-contain grayscale" /> : <span className="text-2xl grayscale">{item.emoji}</span>}
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400">{item.member.avatar} {item.member.name}</p>
                  <p className="font-bold text-slate-500 line-through text-sm">{item.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{GIFT_PURCHASE_STATUS_META[item.purchaseStatus].emoji} {GIFT_PURCHASE_STATUS_META[item.purchaseStatus].label}{item.estimatedCostCents !== null ? ` · ${formatCost(item.estimatedCostCents)}` : ""}</p>
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
        <AmazonProductSearch initialQuery={newGift.title} onSelect={(product) => setNewGift((current) => ({ ...current, title: product.title, amazonUrl: product.url, imageUrl: product.imageUrl ?? "", estimatedCost: estimateFromPrice(product.price) || current.estimatedCost }))} />
        <div><Label className="font-bold">Amazon or Walmart link (optional)</Label><Input value={newGift.amazonUrl} onChange={(event) => setNewGift((current) => ({ ...current, amazonUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" /></div>
        <div><Label className="font-bold">Product image URL (optional)</Label><Input value={newGift.imageUrl} onChange={(event) => setNewGift((current) => ({ ...current, imageUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" />{newGift.imageUrl && <img src={newGift.imageUrl} alt="Gift preview" className="mt-2 h-20 w-20 rounded-xl object-contain" />}</div>
        <div><Label className="font-bold">Estimated cost (optional)</Label><div className="relative mt-1"><DollarSign size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={newGift.estimatedCost} onChange={(event) => setNewGift((current) => ({ ...current, estimatedCost: event.target.value }))} className="rounded-xl pl-8" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" /></div><p className="mt-1 text-xs font-semibold text-slate-400">Amazon selections fill this automatically; you can adjust it. Visible to parents only.</p></div>
        <div><Label className="font-bold">Note (optional)</Label><Input value={newGift.note} onChange={(event) => setNewGift((current) => ({ ...current, note: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <button onClick={addGift} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Add Gift</button>
      </div></DialogContent></Dialog>

      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}><DialogContent className="max-h-[90vh] max-w-md overflow-y-auto rounded-3xl"><DialogHeader><DialogTitle className="font-black">Edit Gift</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">Gift name</Label><Input value={editItem.title} onChange={(event) => setEditItem((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <AmazonProductSearch initialQuery={editItem.title} onSelect={(product) => setEditItem((current) => ({ ...current, title: product.title, amazonUrl: product.url, imageUrl: product.imageUrl ?? "", estimatedCost: estimateFromPrice(product.price) || current.estimatedCost }))} />
        <div><Label className="font-bold">Category</Label><select value={editItem.category} onChange={(event) => { const category = WISH_CATEGORIES.find((entry) => entry.value === event.target.value); setEditItem((current) => ({ ...current, category: event.target.value, emoji: category?.emoji ?? current.emoji })); }} className="mt-1 w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-3 py-2 font-bold">{WISH_CATEGORIES.map((category) => <option key={category.value} value={category.value}>{category.emoji} {category.label}</option>)}</select></div>
        <div><Label className="font-bold">Estimated cost</Label><div className="relative mt-1"><DollarSign size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input value={editItem.estimatedCost} onChange={(event) => setEditItem((current) => ({ ...current, estimatedCost: event.target.value }))} className="rounded-xl pl-8" type="number" inputMode="decimal" min="0" max="1000000" step="0.01" placeholder="0.00" /></div><p className="mt-1 text-xs font-semibold text-slate-400">Clear the field to remove the estimate. Parents only.</p></div>
        <div><Label className="font-bold">Note</Label><Input value={editItem.note} onChange={(event) => setEditItem((current) => ({ ...current, note: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <div><Label className="font-bold">Amazon or Walmart product link</Label><Input value={editItem.amazonUrl} onChange={(event) => setEditItem((current) => ({ ...current, amazonUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" /></div>
        <div><Label className="font-bold">Product image URL</Label><Input value={editItem.imageUrl} onChange={(event) => setEditItem((current) => ({ ...current, imageUrl: event.target.value }))} className="mt-1 rounded-xl" inputMode="url" />{editItem.imageUrl && <img src={editItem.imageUrl} alt="Gift preview" className="mt-2 h-20 w-20 rounded-xl object-contain" />}</div>
        <button onClick={saveItemEdits} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Save Gift</button>
      </div></DialogContent></Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}><DialogContent className="max-w-md rounded-3xl"><DialogHeader><DialogTitle className="font-black">Edit Gift List</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">List name</Label><Input value={editList.title} onChange={(event) => setEditList((current) => ({ ...current, title: event.target.value }))} className="mt-1 rounded-xl" /></div>
        <div className="grid gap-2">{(Object.entries(WISH_LIST_TYPE_META) as [WishListType, typeof WISH_LIST_TYPE_META[WishListType]][]).map(([type, meta]) => { const locked = type === "birthday" && activeList?.type !== "birthday" && !canCreateBirthdayList(activeList?.member.birthdayMonth, activeList?.member.birthdayDay); return <button key={type} disabled={locked} onClick={() => setEditList((current) => ({ ...current, type }))} className={`rounded-2xl border-2 p-3 text-left ${editList.type === type ? "border-violet-400 bg-violet-50" : "border-slate-100 bg-slate-50"} disabled:opacity-45`}><span className="font-black">{meta.emoji} {meta.label}</span><span className="block text-xs font-semibold text-slate-400">{locked ? "Available six weeks before the birthday" : meta.description}</span></button>; })}</div>
        <button onClick={saveListEdits} className="w-full rounded-xl bg-violet-500 py-3 font-black text-white">Save Changes</button>
      </div></DialogContent></Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent className="max-w-lg rounded-3xl"><DialogHeader><DialogTitle className="font-black">Share This List</DialogTitle></DialogHeader><div className="space-y-4">
        <div><Label className="font-bold">Public link</Label><div className="mt-1 flex gap-2"><Input readOnly value={shareData.publicUrl} className="rounded-xl" /><button onClick={() => copy(shareData.publicUrl, "Link")} className="rounded-xl bg-slate-800 p-3 text-white"><Copy size={17} /></button></div></div>
        <div><Label className="font-bold">Embed HTML</Label><textarea readOnly value={shareData.embedHtml} className="mt-1 min-h-28 w-full rounded-xl border-2 border-slate-100 bg-slate-50 p-3 text-xs text-slate-600" /><button onClick={() => copy(shareData.embedHtml, "Embed HTML")} className="mt-2 flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 font-black text-white"><Copy size={16} /> Copy Embed HTML</button></div>
        <p className="text-xs font-semibold text-slate-400">Anyone with the link or a site containing the embed can see the list. Granted gifts are hidden.</p>
      </div></DialogContent></Dialog>
    </div>
  );
}
