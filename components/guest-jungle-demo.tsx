"use client";

import Link from "next/link";
import { Check, Copy, Gamepad2, Share2, Sparkles, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { JungleVineSwing } from "@/components/jungle-runner";

const DEMO_LIMIT = 3;
const DEMO_STORAGE_KEY = "choreslist:jungle-demo-runs";

function storedRuns() {
  try {
    const value = Number.parseInt(window.localStorage.getItem(DEMO_STORAGE_KEY) ?? "0", 10);
    return Number.isFinite(value) ? Math.min(DEMO_LIMIT, Math.max(0, value)) : 0;
  } catch {
    return 0;
  }
}

export function GuestJungleDemo() {
  const [runsUsed, setRunsUsed] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    const used = storedRuns();
    setRunsUsed(used);
    setShowSignup(used >= DEMO_LIMIT);
    setCanShare(typeof navigator.share === "function");
  }, []);

  function claimRun() {
    const used = Math.max(runsUsed ?? 0, storedRuns());
    if (used >= DEMO_LIMIT) {
      setRunsUsed(used);
      setShowSignup(true);
      setPlaying(false);
      return false;
    }
    const next = used + 1;
    try { window.localStorage.setItem(DEMO_STORAGE_KEY, String(next)); } catch { /* Keep the in-memory limit when storage is unavailable. */ }
    setRunsUsed(next);
    return true;
  }

  function leaveGame() {
    const used = Math.max(runsUsed ?? 0, storedRuns());
    setRunsUsed(used);
    setPlaying(false);
    setShowSignup(used >= DEMO_LIMIT);
  }

  async function shareDemo() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Johnny: The People's Champ", text: "Try this jungle adventure game!", url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  if (playing && !showSignup) {
    return <JungleVineSwing onExit={leaveGame} onFinish={leaveGame} onRunStart={claimRun} finishLabel="Finish demo" />;
  }

  const remaining = Math.max(0, DEMO_LIMIT - (runsUsed ?? 0));

  return (
    <main className="min-h-screen bg-[#062f27] text-white">
      <section className="relative isolate min-h-[58vh] overflow-hidden bg-emerald-950 px-5 py-8 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-20 bg-cover bg-center" style={{ backgroundImage: "url('/games/johnny-hero-journey.png')" }} />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-emerald-950 via-emerald-950/90 to-emerald-950/30" />
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <Link href="/" className="text-lg font-black tracking-tight">ChoresList Games</Link>
          <button type="button" onClick={() => void shareDemo()} className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-black backdrop-blur-sm">
            {copied ? <><Check size={17} /> Link copied</> : canShare ? <><Share2 size={17} /> Share game</> : <><Copy size={17} /> Copy game link</>}
          </button>
        </nav>

        <div className="mx-auto flex min-h-[48vh] max-w-6xl items-center py-10">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-yellow-200/50 bg-yellow-300/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-yellow-100"><Sparkles size={15} /> Shareable guest demo</p>
            <h1 className="mt-5 text-4xl font-black leading-none drop-shadow-lg sm:text-6xl">Johnny: The People&apos;s Champ</h1>
            <p className="mt-5 max-w-xl text-base font-bold leading-7 text-emerald-50 sm:text-lg">Run, flip, fight, and gather supplies across eight jungle stages, including the new Savanna Stampede. No account is needed for your first three runs.</p>
            {!showSignup ? (
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <button type="button" disabled={runsUsed === null} onClick={() => setPlaying(true)} className="inline-flex items-center gap-2 rounded-2xl bg-yellow-300 px-6 py-3.5 text-lg font-black text-emerald-950 shadow-xl transition-transform hover:scale-[1.02] disabled:opacity-50"><Gamepad2 size={21} /> Play free demo</button>
                <span className="rounded-xl bg-black/25 px-4 py-3 text-sm font-black">{remaining} of {DEMO_LIMIT} demo runs remaining</span>
              </div>
            ) : (
              <div className="mt-7 max-w-xl rounded-3xl border-2 border-yellow-300/70 bg-emerald-950/90 p-5 shadow-2xl backdrop-blur-sm">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">Demo complete</p>
                <h2 className="mt-2 text-2xl font-black">Ready for the full family game portal?</h2>
                <p className="mt-2 font-semibold text-emerald-100">Create a free household to keep playing, add family players, save scores, and earn game rewards.</p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href="/parent?signup=1&next=%2Fparent%2Fmembers" className="inline-flex items-center gap-2 rounded-xl bg-yellow-300 px-5 py-3 font-black text-emerald-950"><UserPlus size={18} /> Create free account</Link>
                  <Link href="/parent?next=%2Fparent%2Fmembers" className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 font-black text-white">Sign in</Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12">
        {[
          ["🌿", "Seven stages", "Choose one stage or attempt the complete Adventure Mode."],
          ["⚡", "Hero combat", "Jump, slide, dash, fight, and unleash a charged Ki attack."],
          ["🏆", "Family rewards", "Accounts unlock saved scores, player profiles, and parent-controlled rewards."],
        ].map(([icon, title, text]) => <article key={title} className="rounded-3xl bg-white/10 p-5"><span className="text-3xl">{icon}</span><h2 className="mt-3 text-lg font-black">{title}</h2><p className="mt-1 text-sm font-semibold leading-6 text-emerald-100">{text}</p></article>)}
      </section>
    </main>
  );
}
