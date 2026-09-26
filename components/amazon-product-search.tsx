"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { amazonSearchUrl, walmartSearchUrl } from "@/lib/amazon";
import { Input } from "@/components/ui/input";
import type { AmazonProduct } from "@/lib/amazon-creators";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export function AmazonProductSearch({ initialQuery = "", onSelect, selectLabel = "Choose item" }: { initialQuery?: string; onSelect: (product: AmazonProduct) => void | Promise<void>; selectLabel?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setProducts([]);
  }, [initialQuery]);

  async function search() {
    if (query.trim().length < 2) { toast.error("Enter an item to search for"); return; }
    setLoading(true);
    setOpen(true);
    setError("");
    setProducts([]);
    try {
      const res = await fetch(`/api/amazon/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.configured === false ? "Product search is not available yet. Browse Amazon below or paste an item link." : data?.error ?? "Amazon search failed");
        return;
      }
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch {
      setError("Amazon search is temporarily unavailable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function select(product: AmazonProduct) {
    setSelecting(true);
    try {
      await onSelect(product);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not select item");
    } finally { setSelecting(false); }
  }

  function browseWalmart() {
    const url = walmartSearchUrl(query);
    if (!url) { toast.error("Enter an item to search for"); return; }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return <div className="space-y-2 rounded-2xl border-2 border-amber-100 bg-amber-50 p-3">
    <div className="flex gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); search(); } }} placeholder="Search Amazon or Walmart" className="rounded-xl bg-white" /><button type="button" onClick={search} disabled={loading} className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 font-black text-white disabled:opacity-50"><Search size={15} /> {loading ? "Searching" : "Amazon"}</button></div>
    <button type="button" onClick={browseWalmart} className="flex items-center gap-1 text-xs font-black text-blue-700 hover:text-blue-800"><ExternalLink size={13} /> Look up on Walmart</button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl sm:max-w-3xl">
      <DialogHeader><DialogTitle>Gift options</DialogTitle><DialogDescription>Results for “{query}”. Check the size, color, and seller before choosing.</DialogDescription></DialogHeader>
      <div role="status">{loading ? "Finding gift ideas…" : error || (!products.length ? "No items found. Try a more specific item name." : "")}</div>
      {error && <a href={amazonSearchUrl(query)} target="_blank" rel="noopener noreferrer" className="font-bold text-amber-700 underline">Browse Amazon</a>}
      <div className="grid gap-4 sm:grid-cols-2">{products.map((product) => <article key={product.asin} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4">
        {product.imageUrl ? <img src={product.imageUrl} alt={product.title} className="h-36 w-full object-contain" /> : <div className="grid h-36 place-items-center bg-slate-50 text-4xl">🎁</div>}
        <a href={product.url} target="_blank" rel="noopener noreferrer" className="mt-3 font-black text-slate-800 hover:underline">{product.title}</a>
        <p className="mt-2 line-clamp-3 text-sm text-slate-500">{product.description || "Description unavailable."}</p>
        <p className="mt-2 text-xs text-slate-500">Seller: {product.seller || "Not provided"} · Amazon</p>
        <p className="my-3 font-black text-emerald-700">{product.price || "Price unavailable"}</p>
        <a href={walmartSearchUrl(product.title)} target="_blank" rel="noopener noreferrer" className="mb-3 text-xs font-bold text-blue-700 hover:underline">Compare this item on Walmart ↗</a>
        <button type="button" disabled={selecting} onClick={() => select(product)} className="mt-auto rounded-xl bg-violet-600 p-3 font-black text-white disabled:opacity-50">{selecting ? "Saving…" : selectLabel}</button>
      </article>)}</div>
      <p className="text-xs text-slate-500">Prices may change. Confirm the final price with the retailer.</p>
    </DialogContent></Dialog>
  </div>;
}
