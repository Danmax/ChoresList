"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { LocalQrCode } from "@/components/local-qr-code";

export function LandingShareQr({ preferredUrl }: { preferredUrl: string }) {
  const [shareUrl, setShareUrl] = useState(preferredUrl);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setShareUrl(window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, []);

  async function share() {
    if (!shareUrl) return;
    if (navigator.share) {
      await navigator.share({ title: "ChoresList", text: "A simpler way to organize family life.", url: shareUrl }).catch(() => undefined);
      return;
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto w-full max-w-60 rounded-3xl bg-white p-4 text-center text-slate-800 shadow-xl md:mx-0">
      <LocalQrCode value={shareUrl} alt="QR code to open ChoresList" size={208} className="aspect-square w-full rounded-2xl bg-slate-50 object-contain" />
      <p className="mt-3 text-sm font-black">Scan to open ChoresList</p>
      <button onClick={share} disabled={!shareUrl} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
        {copied ? <><Check size={16} /> Link copied</> : canShare ? <><Share2 size={16} /> Share ChoresList</> : <><Copy size={16} /> Copy link</>}
      </button>
    </div>
  );
}
