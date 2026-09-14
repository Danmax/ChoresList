"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function LandingShareQr({ preferredUrl, qrDataUrl }: { preferredUrl: string; qrDataUrl: string }) {
  const [shareUrl, setShareUrl] = useState(preferredUrl);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setShareUrl(preferredUrl || window.location.origin);
    setCanShare(typeof navigator.share === "function");
  }, [preferredUrl]);

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
      {qrDataUrl
        ? <img src={qrDataUrl} alt="QR code to open ChoresList" className="aspect-square w-full rounded-2xl bg-white object-contain" />
        : <div role="img" aria-label="QR code unavailable" className="aspect-square w-full rounded-2xl bg-slate-50" />}
      <p className="mt-3 text-sm font-black">Scan to open ChoresList</p>
      <button onClick={share} disabled={!shareUrl} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-black text-white transition-colors hover:bg-slate-800 disabled:opacity-50">
        {copied ? <><Check size={16} /> Link copied</> : canShare ? <><Share2 size={16} /> Share ChoresList</> : <><Copy size={16} /> Copy link</>}
      </button>
    </div>
  );
}
