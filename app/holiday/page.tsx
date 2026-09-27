import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Gift, Heart, ShoppingBag, Sparkles } from "lucide-react";
import { HolidayListBuilder } from "@/components/holiday-list-builder";

export const metadata: Metadata = {
  title: "Family Holiday Gift Lists | ChoresList",
  description: "Build cheerful family wish lists, compare retailers, and plan thoughtful holiday surprises with ChoresList.",
};
const startUrl = "#build-list";
const signInUrl = "/parent?next=%2Fparent%2Fwishlist%3Fholiday%3D1";
const ideas = [
  { emoji: "🧸", label: "LITTLE WISHES", title: "Small hands. Big smiles.", detail: "Pretend play, plush friends, and building adventures.", color: "bg-[#f2e6d6]" },
  { emoji: "🎮", label: "TEEN FAVORITES", title: "Their kind of cool.", detail: "Gaming, headphones, and a room that feels like them.", color: "bg-[#ddd6f3]" },
  { emoji: "🎨", label: "CREATIVE SPIRITS", title: "Make something magic.", detail: "Art supplies, craft kits, books, and new hobbies.", color: "bg-[#e4edc7]" },
  { emoji: "🎧", label: "GROWN-UP JOY", title: "You get a list too.", detail: "Everyday upgrades, cozy finds, and little luxuries.", color: "bg-[#f3d7d7]" },
];

export default function HolidayLandingPage() {
  return <main className="min-h-screen bg-[#fffaf5] text-slate-800 selection:bg-rose-200 selection:text-slate-900">
    <div className="bg-rose-100 px-4 py-3 text-center text-xs font-black uppercase tracking-[0.14em] text-rose-800">A little less holiday juggling. A lot more joy.</div>
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
      <Link href="/" className="flex items-center gap-2 font-black"><Gift size={23} className="text-rose-500" /> ChoresList<span className="hidden border-l border-rose-200 pl-3 text-xs text-slate-500 sm:inline">FAMILY GIFT LISTS</span></Link>
      <nav aria-label="Holiday navigation" className="flex items-center gap-4 text-sm font-bold"><a href="#ideas" className="hidden text-slate-500 hover:text-rose-600 sm:inline">Gift ideas</a><Link href={signInUrl} className="rounded-xl px-3 py-2 text-slate-600 hover:bg-white">Sign in</Link></nav>
    </header>
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-2 lg:py-16">
      <div>
        <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-widest text-rose-600 shadow-sm"><Sparkles size={14} /> Make room for the fun part</p>
        <h1 className="text-5xl font-black leading-[0.98] tracking-tight text-slate-900 sm:text-7xl">Wish together.<br /><span className="text-rose-500">Gift with heart.</span></h1>
        <p className="mt-7 max-w-lg text-lg leading-relaxed text-slate-600">Gather everyone’s wishes, save the exact items, and keep your gift planning in one calm, happy place.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href={startUrl} className="inline-flex items-center gap-3 rounded-2xl bg-rose-500 px-6 py-4 font-black text-white shadow-lg shadow-rose-200 transition hover:-translate-y-0.5 hover:bg-rose-600">Start our family list <ArrowRight size={19} /></Link><a href="#how-it-works" className="rounded-2xl border border-rose-200 bg-white px-5 py-4 font-bold text-slate-700 hover:bg-rose-50">How it works</a></div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">{["Free to start", "Private by default", "Made for families"].map((text) => <span key={text} className="flex items-center gap-1.5"><Check size={13} className="text-emerald-500" />{text}</span>)}</div>
      </div>
      <div className="relative pb-7 pl-3 sm:pl-8">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[3rem] bg-rose-100 shadow-xl shadow-rose-100 sm:aspect-square">
          <Image src="/holiday-gift-hero.png" alt="Holiday gift inspiration with a teddy bear, toy train, books, and headphones beside a Christmas tree" fill priority sizes="(max-width: 1024px) 100vw, 600px" className="object-cover object-right" />
          <span className="absolute right-4 top-5 rotate-3 rounded-2xl bg-amber-200 px-4 py-3 text-center text-sm font-black text-amber-950">Picked with<br />love.</span>
        </div>
        <div className="absolute bottom-0 left-0 right-6 rounded-2xl border border-rose-100 bg-white p-5 shadow-lg"><p className="text-xs font-bold uppercase tracking-widest text-rose-500">A happier kind of planning</p><p className="mt-2 text-xl font-black">“The one they actually wanted.”</p><p className="mt-1 text-sm text-slate-500">Photos. Exact links. Fewer guessing games.</p></div>
      </div>
    </section>
    <div className="border-y border-rose-100 bg-white/80 px-5 py-5"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-10 gap-y-3 text-xs font-black uppercase tracking-widest text-slate-600"><span>Save the wish</span><Heart size={14} className="fill-rose-400 text-rose-400" /><span>Compare options</span><Heart size={14} className="fill-rose-400 text-rose-400" /><span>Keep the surprise</span></div></div>
    <HolidayListBuilder />
    <section id="ideas" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">A little inspiration</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Every age. Every kind of joy.</h2><p className="mt-4 max-w-xl leading-relaxed text-slate-600">Follow their interests and make a list that feels like them.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{ideas.map((idea) => <article key={idea.label} className={`group flex flex-col rounded-3xl p-6 shadow-sm ${idea.color}`}><p className="text-[10px] font-black tracking-[0.2em] text-slate-500">{idea.label}</p><div className="flex h-32 items-center justify-center text-7xl transition-transform group-hover:-rotate-6 motion-reduce:transform-none" aria-hidden="true">{idea.emoji}</div><h3 className="text-2xl font-black leading-tight tracking-tight">{idea.title}</h3><p className="mb-6 mt-3 text-sm leading-relaxed text-slate-600">{idea.detail}</p><Link href={startUrl} className="mt-auto flex items-center justify-between border-t border-slate-900/10 pt-4 text-sm font-black hover:text-rose-600">Make a wish list <ArrowRight size={17} /></Link></article>)}</div>
      <p className="mt-4 text-xs text-slate-500">Gift inspiration only. Check retailers for current prices and availability.</p>
    </section>
    <section id="how-it-works" className="bg-rose-100/70 px-5 py-16 sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-widest text-rose-500">Less scrolling. More celebrating.</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Your simple holiday game plan.</h2><div className="mt-10 grid gap-5 md:grid-cols-3">{[
      { title: "01 / Build their list", detail: "Name a list and try two gift ideas without signing up. Your draft stays in this browser until you’re ready to create an account." },
      { title: "02 / Compare & plan", detail: "See Amazon previews, search Walmart, and keep exact item links together." },
      { title: "03 / Share the magic", detail: "Choose when to share a list with family. Parent purchase tracking stays private." },
    ].map(({ title, detail }) => <div key={title} className="rounded-3xl bg-white p-6 shadow-sm"><ShoppingBag size={26} className="text-rose-500" /><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 leading-relaxed text-slate-600">{detail}</p></div>)}</div></div></section>
    <section className="px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-4xl text-center"><p className="text-xs font-black uppercase tracking-widest text-rose-500">Start with the holidays. Stay for family life.</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">All the wishes.<br />One happy place.</h2><p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-600">Start with gift lists. Explore chores, allowance, and family planning whenever you’re ready.</p><Link href={startUrl} className="mt-8 inline-flex items-center gap-3 rounded-2xl bg-rose-500 px-7 py-4 font-black text-white hover:bg-rose-600">Create our free list <ArrowRight size={19} /></Link></div></section>
    <footer className="border-t border-rose-100 bg-white px-5 py-7 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 text-xs text-slate-500"><Link href="/" className="font-bold text-slate-700">ChoresList / More joy, less juggling.</Link><div className="flex gap-5"><Link href="/privacy" className="hover:text-rose-600">Privacy</Link><Link href="/terms" className="hover:text-rose-600">Terms</Link><Link href={signInUrl} className="hover:text-rose-600">Sign in</Link></div></div></footer>
  </main>;
}
