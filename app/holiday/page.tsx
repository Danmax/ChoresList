import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Gift, Sparkles, Star } from "lucide-react";

const ideas = [
  { emoji: "🧱", title: "Big imaginations", subtitle: "Building sets, pretend play & puzzles", color: "bg-red-50" },
  { emoji: "🕹️", title: "Game on", subtitle: "Gaming, headphones & room upgrades", color: "bg-violet-50" },
  { emoji: "📚", title: "Cozy favorites", subtitle: "Books, crafts, collectibles & comfort", color: "bg-amber-50" },
  { emoji: "✨", title: "Grown-up joy", subtitle: "Hobbies, practical finds & little luxuries", color: "bg-emerald-50" },
];

const startUrl = "/parent?signup=1&next=%2Fparent%2Fwishlist%3Fholiday%3D1";

export default function HolidayLandingPage() {
  return <main className="min-h-screen overflow-hidden bg-[#fffaf4] text-slate-900">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <Link href="/" className="flex items-center gap-2 font-black tracking-tight text-slate-800"><span className="grid h-10 w-10 place-items-center rounded-xl bg-red-600 text-xl shadow-sm">🎁</span> ChoresList</Link>
      <Link href="/parent" className="text-sm font-black text-slate-600 hover:text-red-700">Sign in</Link>
    </header>

    <section className="px-5 pb-14 pt-4 sm:px-8 sm:pb-20">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#163d31] px-7 py-12 text-white shadow-2xl shadow-red-950/20 sm:px-12 sm:py-16">
        <Image src="/holiday-gift-hero.png" alt="A festive collection of gifts, toys, books, and headphones beside a Christmas tree" fill priority sizes="(max-width: 768px) 100vw, 1152px" className="object-cover object-right opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#163d31] via-[#163d31]/90 to-[#163d31]/10" />
        <div className="relative max-w-xl">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em]"><Sparkles size={14} /> Holiday list season</p>
          <h1 className="mt-5 text-4xl font-black leading-[1.02] tracking-tight sm:text-6xl">Make the magic. <span className="text-amber-300">Skip the guesswork.</span></h1>
          <p className="mt-5 max-w-lg text-lg font-semibold leading-relaxed text-emerald-50">Create every Christmas wish list in one happy place. Save exact items, share a private list, and keep the surprise intact.</p>
          <div className="mt-8 flex flex-wrap gap-3"><Link href={startUrl} className="inline-flex items-center gap-2 rounded-2xl bg-red-500 px-5 py-3.5 font-black text-white shadow-lg shadow-red-950/30 transition hover:bg-red-400">Start a holiday list <ArrowRight size={18} /></Link><a href="#ideas" className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3.5 font-black hover:bg-white/20">Find ideas</a></div>
          <p className="mt-4 text-sm font-bold text-emerald-100">Free to start · Private by default · Takes about a minute</p>
        </div>
      </div>
    </section>

    <section id="ideas" className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12"><div className="max-w-2xl"><p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">Holiday inspiration</p><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Favorite things for every age—and every kind of joy.</h2><p className="mt-3 font-semibold leading-relaxed text-slate-500">Start with a spark, then use Amazon search or Walmart comparison to save the exact version they&apos;ll love.</p></div><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{ideas.map((idea) => <article key={idea.title} className={`rounded-3xl ${idea.color} p-5 ring-1 ring-black/5`}><span className="text-4xl">{idea.emoji}</span><h3 className="mt-4 text-lg font-black">{idea.title}</h3><p className="mt-1 text-sm font-semibold leading-relaxed text-slate-500">{idea.subtitle}</p><Link href={startUrl} className="mt-5 inline-flex items-center gap-1 text-sm font-black text-red-700 hover:text-red-800">Build a list <ArrowRight size={15} /></Link></article>)}</div></section>

    <section className="px-5 py-14 sm:px-8"><div className="mx-auto max-w-5xl rounded-[2rem] bg-white p-7 shadow-sm ring-1 ring-red-100 sm:p-10"><div className="grid gap-8 md:grid-cols-[1.15fr_1fr]"><div><p className="text-sm font-black uppercase tracking-[0.16em] text-red-600">One place. Less stress.</p><h2 className="mt-3 text-3xl font-black tracking-tight">The list that turns &ldquo;what do they want?&rdquo; into &ldquo;done.&rdquo;</h2></div><ul className="space-y-4">{["Kids can add wishes with photos and exact links", "Share a clean, private list with family", "Parents track estimates and what is already bought"].map((item) => <li key={item} className="flex gap-3 font-bold text-slate-600"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check size={14} /></span>{item}</li>)}</ul></div><div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-red-50 p-5"><p className="flex items-center gap-2 font-black text-slate-700"><Gift className="text-red-600" /> Your holiday list starts here.</p><Link href={startUrl} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 font-black text-white hover:bg-red-700">Create mine <Star size={16} /></Link></div></div></section>
  </main>;
}
