"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { looksLikeImageUrl, retailerForUrl, supportsProductPreview } from "@/lib/amazon";

export function ProductUrlInput({ value, onChange, onImage, className, placeholder }: { value: string; onChange: (value: string) => void; onImage: (imageUrl: string) => void; className?: string; placeholder?: string }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{ imageUrl: string; title: string | null } | null>(null);

  async function fetchImage() {
    if (!value.trim()) return;
    if (looksLikeImageUrl(value.trim())) {
      onImage(value.trim());
      setPreview({ imageUrl: value.trim(), title: null });
      return;
    }
    if (!supportsProductPreview(value.trim())) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/product-preview?url=${encodeURIComponent(value.trim())}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.imageUrl !== "string") return;
      onImage(data.imageUrl);
      setPreview({ imageUrl: data.imageUrl, title: typeof data.title === "string" ? data.title : null });
      toast.success("Product image added");
    } catch {
      // A pasted link remains valid even if the retailer does not expose preview metadata.
    } finally {
      setLoading(false);
    }
  }

  return <div>
    <Input value={value} onChange={(event) => { onChange(event.target.value); setPreview(null); }} onBlur={fetchImage} className={className} inputMode="url" placeholder={placeholder} />
    {loading && <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-slate-400"><Loader2 size={12} className="animate-spin" /> Fetching product preview…</p>}
    {preview && <a href={value} target="_blank" rel="noopener noreferrer" className="mt-2 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-2 text-left hover:border-violet-300">
      <img src={preview.imageUrl} alt="Product preview" className="size-12 rounded-lg object-contain" />
      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-black text-slate-700">{preview.title ?? "Product preview"}</span><span className="text-xs font-bold text-slate-400">{retailerForUrl(value)} · Open item</span></span>
      <ExternalLink size={15} className="shrink-0 text-slate-400" />
    </a>}
  </div>;
}
