"use client";

import { useEffect, useState } from "react";
import { ExternalLink, Search } from "lucide-react";
import { toast } from "sonner";
import { amazonSearchUrl } from "@/lib/amazon";
import { Input } from "@/components/ui/input";
import type { AmazonProduct } from "@/lib/amazon-creators";

export function AmazonProductSearch({ initialQuery = "", onSelect }: { initialQuery?: string; onSelect: (product: AmazonProduct) => void }) {
  const [query, setQuery] = useState(initialQuery);
  const [products, setProducts] = useState<AmazonProduct[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setQuery(initialQuery);
    setProducts([]);
  }, [initialQuery]);

  async function search() {
    if (query.trim().length < 2) { toast.error("Enter an item to search for"); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/amazon/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.configured === false) window.open(amazonSearchUrl(query), "_blank", "noopener,noreferrer");
        toast.error(data?.configured === false ? "Amazon catalog search needs Creators API credentials. Opened Amazon instead." : data?.error ?? "Amazon search failed");
        return;
      }
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch {
      toast.error("Amazon search is temporarily unavailable");
    } finally {
      setLoading(false);
    }
  }

  function select(product: AmazonProduct) {
    onSelect(product);
    setProducts([]);
  }

  return <div className="space-y-2 rounded-2xl border-2 border-amber-100 bg-amber-50 p-3">
    <div className="flex gap-2"><Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); search(); } }} placeholder="Search Amazon products" className="rounded-xl bg-white" /><button type="button" onClick={search} disabled={loading} className="flex items-center gap-1 rounded-xl bg-amber-500 px-3 font-black text-white disabled:opacity-50"><Search size={15} /> {loading ? "Searching" : "Search"}</button></div>
    {products.length > 0 && <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{products.map((product) => <button key={product.asin} type="button" onClick={() => select(product)} className="flex items-center gap-2 rounded-xl bg-white p-2 text-left shadow-sm hover:ring-2 hover:ring-amber-300">
      {product.imageUrl ? <img src={product.imageUrl} alt="" className="h-14 w-14 shrink-0 rounded-lg object-contain" /> : <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100">🎁</div>}
      <span className="min-w-0"><span className="line-clamp-2 block text-xs font-black text-slate-700">{product.title}</span>{product.price && <span className="text-xs font-bold text-emerald-600">{product.price}</span>}<span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">Select item <ExternalLink size={10} /></span></span>
    </button>)}</div>}
  </div>;
}
