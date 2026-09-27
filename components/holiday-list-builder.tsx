"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AmazonProductSearch } from "./amazon-product-search";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { HOLIDAY_DRAFT_KEY, parseHolidayDraft, type HolidayList } from "@/lib/holiday-draft";
import type { AmazonProduct } from "@/lib/amazon-creators";
import { cleanAmazonUrl } from "@/lib/amazon";

export function HolidayListBuilder() {
  const [lists, setLists] = useState<HolidayList[]>([]);
  const [activeId, setActiveId] = useState("");
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState(false);
  const [message, setMessage] = useState("");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  useEffect(() => {
    try {
      const saved = parseHolidayDraft(JSON.parse(localStorage.getItem(HOLIDAY_DRAFT_KEY) ?? "[]"));
      setLists(saved); setActiveId(saved[0]?.id ?? "");
    } catch { setMessage("Browser storage is unavailable. Keep this tab open while you build your list."); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(HOLIDAY_DRAFT_KEY, JSON.stringify(lists)); }
    catch { setMessage("Your browser could not save this draft. Keep this tab open."); }
  }, [lists, ready]);
  const active = lists.find((list) => list.id === activeId);
  const count = lists.reduce((total, list) => total + list.items.length, 0);
  function add(product: AmazonProduct) {
    if (!active) { setMessage("Name your list first."); return; }
    if (count >= 2) { setGate(true); return; }
    if (active.items.some((item) => item.asin === product.asin)) { setMessage("That gift is already on this list."); return; }
    setLists((current) => current.map((list) => list.id === activeId ? { ...list, items: [...list.items, product] } : list));
    setMessage(""); setTitle(""); setUrl("");
  }
  return <section id="build-list" className="mx-auto max-w-7xl scroll-mt-6 px-5 py-16 sm:px-8">
    <p className="text-xs font-black uppercase tracking-widest text-[#dbff00]">Try it before you sign up</p>
    <h2 className="mt-3 text-3xl font-black">Your wishes start here.</h2>
    <p className="mt-3 text-zinc-300">Save two gifts across your lists, right in this browser. Create an account to add more and keep them with your family.</p>
    <form className="my-6 flex flex-wrap gap-3" onSubmit={(event) => {
      event.preventDefault(); if (!name.trim()) return;
      if (lists.length >= 10) { setGate(true); return; }
      const id = crypto.randomUUID(); setLists([...lists, { id, title: name.trim(), items: [] }]); setActiveId(id); setName("");
    }}>
      <input aria-label="New list name" maxLength={120} required value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Emma’s Christmas wishes" className="min-w-0 flex-1 rounded-xl border border-zinc-600 bg-zinc-900 p-3 text-white" />
      <button disabled={!ready} className="rounded-xl bg-[#dbff00] px-5 py-3 font-black text-black">Create new list</button>
    </form>
    <div className="mb-5 flex flex-wrap gap-2">{lists.map((list) => <button key={list.id} onClick={() => setActiveId(list.id)} aria-pressed={activeId === list.id} className={`rounded-xl border px-4 py-2 font-bold ${activeId === list.id ? "border-lime-300 text-lime-300" : "border-zinc-700 text-zinc-300"}`}>{list.title} ({list.items.length})</button>)}</div>
    {active && <div className="space-y-5">
      <label className="block text-sm font-bold">List name<input maxLength={120} value={active.title} onChange={(event) => setLists(lists.map((list) => list.id === activeId ? { ...list, title: event.target.value } : list))} className="mt-2 block w-full rounded-xl border border-zinc-600 bg-zinc-900 p-3" /></label>
      <div className="text-slate-900"><AmazonProductSearch guest onSelect={add} selectLabel="Add to my list" /></div>
      <form className="flex flex-wrap gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (url.trim() && !cleanAmazonUrl(url)) { setMessage("Use an Amazon or Walmart HTTPS product link."); return; }
        add({ asin: crypto.randomUUID(), title: title.trim(), url: cleanAmazonUrl(url) ?? "", imageUrl: null, price: null });
      }}>
        <input required maxLength={255} aria-label="Gift idea" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Or add your own gift idea" className="min-w-0 flex-1 rounded-xl border border-zinc-600 bg-zinc-900 p-3" />
        <input aria-label="Optional product link" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Amazon or Walmart link (optional)" className="min-w-0 flex-1 rounded-xl border border-zinc-600 bg-zinc-900 p-3" />
        <button className="rounded-xl bg-white px-4 py-3 font-bold text-black">Add gift</button>
      </form>
      <p className="text-sm text-zinc-400">{count}/2 guest gifts · Stored on this browser only</p>
      <div className="grid gap-4 sm:grid-cols-2">{active.items.map((item) => <article key={item.asin} className="rounded-2xl bg-white p-5 text-slate-900">
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="h-40 w-full object-contain" /> : <div className="grid h-40 place-items-center rounded-xl bg-violet-50 text-6xl">🎁</div>}
        <h3 className="mt-4 font-black">{item.url ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{item.title}</a> : item.title}</h3>
        <p className="my-2 text-emerald-700">{item.price ?? "Price not added"}</p>
        <button onClick={() => setLists(lists.map((list) => list.id === activeId ? { ...list, items: list.items.filter((entry) => entry.asin !== item.asin) } : list))} className="text-sm font-bold text-red-700">Remove gift</button>
      </article>)}</div>
      {!active.items.length && <p className="rounded-xl border border-dashed border-zinc-600 p-6 text-zinc-400">Find a gift above to see it on your list.</p>}
      <button onClick={() => setGate(true)} className="font-bold text-lime-300 underline">Save my lists to an account</button>
    </div>}
    {message && <p role="status" className="mt-4 text-amber-300">{message}</p>}
    <Dialog open={gate} onOpenChange={setGate}><DialogContent><DialogHeader><DialogTitle>Keep your wishes going</DialogTitle><DialogDescription>You can save two gifts as a guest. Sign up to add your third and bring your named lists with you. Return on this browser to import your draft.</DialogDescription></DialogHeader>
      <Link href="/parent?signup=1&next=%2Fparent%2Fwishlist%3Fholiday%3D1" className="rounded-xl bg-violet-600 p-3 text-center font-bold text-white">Create my free account</Link>
      <Link href="/parent?next=%2Fparent%2Fwishlist%3Fholiday%3D1" className="text-center font-bold">Already a member? Sign in</Link>
    </DialogContent></Dialog>
  </section>;
}
