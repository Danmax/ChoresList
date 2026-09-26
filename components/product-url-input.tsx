"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

export function ProductUrlInput({ value, onChange, onImage, className, placeholder }: { value: string; onChange: (value: string) => void; onImage: (imageUrl: string) => void; className?: string; placeholder?: string }) {
  const [loading, setLoading] = useState(false);

  async function fetchImage() {
    if (!value.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/product-preview?url=${encodeURIComponent(value.trim())}`);
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.imageUrl !== "string") return;
      onImage(data.imageUrl);
      toast.success("Product image added");
    } catch {
      // A pasted link remains valid even if the retailer does not expose preview metadata.
    } finally {
      setLoading(false);
    }
  }

  return <div>
    <Input value={value} onChange={(event) => onChange(event.target.value)} onBlur={fetchImage} className={className} inputMode="url" placeholder={placeholder} />
    {loading && <p className="mt-1 text-xs font-semibold text-slate-400">Fetching product image…</p>}
  </div>;
}
