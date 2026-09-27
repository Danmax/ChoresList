import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, Gift, ShoppingBag, Sparkles } from "lucide-react";
import { HolidayListBuilder } from "@/components/holiday-list-builder";

export const metadata: Metadata = {
  title: "Black Friday Gift Lists | ChoresList",
  description: "Build holiday wish lists, compare retailers, and plan Christmas surprises with ChoresList.",
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
  return <main className="min-h-screen bg-[#101010] text-white selection:bg-[#dbff00] selection:text-black">
    <div className="bg-[#dbff00] px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.16em] text-black">Big wish lists. Thoughtful gifts. Your holiday head start.</div>
    <header className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-6 sm:px-8">
      <Link href="/" className="flex items-center gap-2 font-black"><Gift size={23} className="text-[#dbff00]" /> ChoresList<span className="hidden border-l border-white/25 pl-3 text-xs text-zinc-400 sm:inline">THE GIFT EDIT</span></Link>
      <nav aria-label="Holiday navigation" className="flex items-center gap-4 text-sm font-bold"><a href="#ideas" className="hidden text-zinc-300 hover:text-white sm:inline">Gift inspiration</a><Link href={signInUrl} className="underline underline-offset-4">Sign in</Link></nav>
    </header>
    <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-2 lg:py-16">
      <div>
        <p className="mb-6 inline-flex items-center gap-2 border border-white/25 px-3 py-2 text-xs font-black uppercase tracking-widest"><Sparkles size={14} className="text-[#dbff00]" /> Black Friday mindset. Christmas magic.</p>
        <h1 className="text-6xl font-black uppercase leading-[0.92] tracking-tighter sm:text-8xl">Wish big.<br /><span className="text-[#dbff00]">Shop smart.</span><br />Gift happy.</h1>
        <p className="mt-7 max-w-lg text-lg leading-relaxed text-zinc-300">The best gifts start with a good list. Gather their wishes, save the exact items, and compare retailers before you buy.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href={startUrl} className="inline-flex items-center gap-3 bg-[#dbff00] px-6 py-4 font-black text-black hover:bg-white">Start my holiday list <ArrowRight size={19} /></Link><a href="#how-it-works" className="border border-zinc-600 px-5 py-4 font-bold hover:border-white">How it works</a></div>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-zinc-400">{["Free to start", "Private by default", "Made for families"].map((text) => <span key={text} className="flex items-center gap-1.5"><Check size={13} className="text-[#dbff00]" />{text}</span>)}</div>
      </div>
      <div className="relative pb-7 pl-3 sm:pl-8">
        <div className="relative aspect-[4/5] overflow-hidden rounded-t-[7rem] bg-[#efe0cb] sm:aspect-square">
          <Image src="/holiday-gift-hero.png" alt="Holiday gift inspiration with a teddy bear, toy train, books, and headphones beside a Christmas tree" fill priority sizes="(max-width: 1024px) 100vw, 600px" className="object-cover object-right" />
          <span className="absolute right-4 top-5 rotate-6 bg-[#dbff00] px-4 py-3 text-center text-sm font-black uppercase text-black">Good gifts.<br />Great plans.</span>
        </div>
        <div className="absolute bottom-0 left-0 right-6 border border-zinc-700 bg-[#1b1b1b] p-5 shadow-xl"><p className="text-xs font-bold uppercase tracking-widest text-zinc-400">A little list inspiration</p><p className="mt-2 text-xl font-black">“The one they actually wanted.”</p><p className="mt-1 text-sm text-zinc-400">Photos. Exact links. Fewer guessing games.</p></div>
      </div>
    </section>
    <div className="border-y border-zinc-800 bg-[#191919] px-5 py-5"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-10 gap-y-3 text-xs font-black uppercase tracking-widest text-zinc-300"><span>Save the wish</span><span className="text-[#dbff00]" aria-hidden="true">✦</span><span>Compare the options</span><span className="text-[#dbff00]" aria-hidden="true">✦</span><span>Keep the surprise</span></div></div>
    <HolidayListBuilder />
    <section id="ideas" className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#dbff00]">The inspiration aisle</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Every age. Every kind of joy.</h2><p className="mt-4 max-w-xl leading-relaxed text-zinc-400">Ideas for boys, girls, and grown-ups. Follow their interests and make the list their own.</p>
      <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{ideas.map((idea) => <article key={idea.label} className={`group flex flex-col p-6 text-black ${idea.color}`}><p className="text-[10px] font-black tracking-[0.2em]">{idea.label}</p><div className="flex h-32 items-center justify-center text-7xl transition-transform group-hover:-rotate-6 motion-reduce:transform-none" aria-hidden="true">{idea.emoji}</div><h3 className="text-2xl font-black leading-tight tracking-tight">{idea.title}</h3><p className="mb-6 mt-3 text-sm leading-relaxed text-black/70">{idea.detail}</p><Link href={startUrl} className="mt-auto flex items-center justify-between border-t border-black/20 pt-4 text-sm font-black hover:underline">Make a wish list <ArrowRight size={17} /></Link></article>)}</div>
      <p className="mt-4 text-xs text-zinc-400">Gift inspiration. Check retailers for current prices and availability.</p>
    </section>
    <section id="how-it-works" className="bg-[#f5f3ed] px-5 py-16 text-black sm:px-8 sm:py-20"><div className="mx-auto max-w-7xl"><p className="text-xs font-black uppercase tracking-widest text-zinc-500">Less scrolling. More celebrating.</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Your holiday game plan.</h2><div className="mt-10 grid gap-8 md:grid-cols-3">{[
      { title: "01 / Build their list", detail: "Name a list and try two gift ideas without signing up. Your draft stays in this browser until you’re ready to create an account." },
      { title: "02 / Compare & plan", detail: "Look up items on Amazon and compare on Walmart. Keep estimates and purchase progress together." },
      { title: "03 / Share the magic", detail: "Choose when to share a list with family. Parent purchase tracking stays private." },
    ].map(({ title, detail }) => <div key={title} className="border-t-2 border-black pt-5"><ShoppingBag size={26} /><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-3 leading-relaxed text-zinc-600">{detail}</p></div>)}</div></div></section>
    <section className="px-5 py-16 sm:px-8 sm:py-24"><div className="mx-auto max-w-4xl text-center"><p className="text-xs font-black uppercase tracking-widest text-[#dbff00]">Start with the holidays. Stay for family life.</p><h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">All the wishes.<br />One happy place.</h2><p className="mx-auto mt-5 max-w-xl leading-relaxed text-zinc-400">Start with gift lists. Explore chores, allowance, and family planning whenever you’re ready.</p><Link href={startUrl} className="mt-8 inline-flex items-center gap-3 bg-[#dbff00] px-7 py-4 font-black text-black hover:bg-white">Create my free list <ArrowRight size={19} /></Link></div></section>
    <footer className="border-t border-zinc-800 px-5 py-7 sm:px-8"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-4 text-xs text-zinc-400"><Link href="/" className="font-bold text-white">ChoresList / More joy, less juggling.</Link><div className="flex gap-5"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href={signInUrl} className="hover:text-white">Sign in</Link></div></div></footer>
  </main>;
}
