import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, ClipboardList, Gift, GraduationCap, HeartHandshake, ListChecks, LockKeyhole, MonitorSmartphone, ShoppingCart, Sparkles, Users } from "lucide-react";
import { LandingShareQr } from "@/components/landing-share-qr";

const highlights = [
  { icon: Gift, accent: "bg-pink-100 text-pink-600", eyebrow: "New", title: "Private gift planning", description: "Build shareable wish lists while parents privately track what is ordered, obtained, ready to give, and the estimated cost." },
  { icon: ListChecks, accent: "bg-violet-100 text-violet-600", eyebrow: "Chores", title: "Routines kids can own", description: "Assign one-time or repeating chores, add age-aware instructions, and celebrate progress with points and levels." },
  { icon: CalendarDays, accent: "bg-blue-100 text-blue-600", eyebrow: "Planning", title: "One family calendar", description: "Coordinate appointments, school, sports, rehearsals, travel, recurring activities, and community events." },
  { icon: ShoppingCart, accent: "bg-emerald-100 text-emerald-600", eyebrow: "Home", title: "Groceries and pantry", description: "Keep reusable shopping lists, mark what is already on hand, include quantities, and save receipt photos." },
  { icon: GraduationCap, accent: "bg-amber-100 text-amber-600", eyebrow: "Growth", title: "Learning, skills, and rewards", description: "Track projects and skill growth, award badges, calculate allowance, and create rewards kids can work toward." },
  { icon: HeartHandshake, accent: "bg-rose-100 text-rose-600", eyebrow: "Care", title: "Private wellbeing check-ins", description: "Give family members a quiet way to say how they are doing—without points, rankings, or public comparisons." },
];

const moreTools = [
  "Community groups, events, RSVPs, and potlucks",
  "Surveys, polls, feedback forms, and reports",
  "Recipes with shopping-list ingredients",
  "Family tree and household relationships",
  "Email reminders and weekly summaries",
  "Dedicated kid screens for shared devices",
];

const gettingStarted = [
  { number: "01", title: "Create your household", description: "Sign up with a parent email and give your household a name." },
  { number: "02", title: "Add your family", description: "Create profiles for kids, parents, grandparents, and guardians." },
  { number: "03", title: "Choose your tools", description: "Start with chores, then turn on the planning tools that fit your family." },
];

export default function LandingPage() {
  const publicUrl = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? "";

  return (
    <main className="min-h-screen text-slate-800">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="ChoresList home">
          <Image src="/logo.png" alt="" width={48} height={48} priority className="h-11 w-11 rounded-xl object-contain" />
          <span className="text-xl font-black tracking-tight">ChoresList</span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Account navigation">
          <Link href="/parent" className="rounded-xl px-3 py-2 text-sm font-black text-slate-600 transition-colors hover:bg-white sm:px-4">Sign in</Link>
          <Link href="/parent?signup=1" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-black text-white shadow-sm transition-colors hover:bg-violet-700">Start free</Link>
        </nav>
      </header>

      <section className="relative overflow-hidden px-5 pb-20 pt-12 sm:px-8 sm:pb-28 sm:pt-20">
        <div className="absolute left-1/2 top-8 -z-10 h-96 w-96 -translate-x-1/2 rounded-full bg-violet-200/40 blur-3xl" />
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-violet-600 shadow-sm"><Sparkles size={15} /> One place for family life</div>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.03] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">Less household chaos. <span className="text-violet-600">More teamwork.</span></h1>
            <p className="mt-6 max-w-2xl text-lg font-semibold leading-relaxed text-slate-500 sm:text-xl">ChoresList brings chores, schedules, shopping, gifts, learning, rewards, and family check-ins together in one friendly family suite.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/parent?signup=1" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-7 py-4 text-lg font-black text-white shadow-lg shadow-violet-200 transition-all hover:-translate-y-0.5 hover:bg-violet-700">Create your household <ArrowRight size={20} /></Link>
              <Link href="#features" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-7 py-4 text-lg font-black text-slate-700 shadow-sm transition-colors hover:bg-slate-50">Explore features</Link>
            </div>
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm font-bold text-slate-500">
              <span className="flex items-center gap-1.5"><Check size={16} className="text-emerald-500" /> Free to get started</span>
              <span className="flex items-center gap-1.5"><Check size={16} className="text-emerald-500" /> No app-store download</span>
              <span className="flex items-center gap-1.5"><LockKeyhole size={15} className="text-emerald-500" /> Parent controls included</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="rounded-[2rem] border border-white/80 bg-white/85 p-5 shadow-2xl shadow-violet-200/60 backdrop-blur sm:p-7">
              <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-violet-500">Today at home</p><p className="mt-1 text-2xl font-black">Everyone knows what’s next</p></div><div className="rounded-2xl bg-violet-100 p-3 text-violet-600"><ClipboardList size={25} /></div></div>
              <div className="mt-6 space-y-3">
                {[
                  { icon: "✅", title: "Morning chores", detail: "3 of 4 complete", color: "bg-emerald-50" },
                  { icon: "📅", title: "Soccer practice", detail: "Today · 5:30 PM", color: "bg-blue-50" },
                  { icon: "🛒", title: "Weekly groceries", detail: "8 items remaining", color: "bg-amber-50" },
                  { icon: "🎁", title: "Birthday gift", detail: "Obtained · ready to give", color: "bg-pink-50" },
                ].map((item) => <div key={item.title} className={`flex items-center gap-3 rounded-2xl ${item.color} p-4`}><span className="text-2xl">{item.icon}</span><div className="min-w-0 flex-1"><p className="font-black text-slate-800">{item.title}</p><p className="text-xs font-bold text-slate-500">{item.detail}</p></div><Check size={18} className="text-slate-300" /></div>)}
              </div>
            </div>
            <div className="absolute -bottom-6 -left-4 hidden rounded-2xl bg-slate-900 px-5 py-4 text-white shadow-xl sm:block"><p className="text-xs font-bold text-slate-300">Family progress</p><p className="text-xl font-black">A calmer week ✨</p></div>
          </div>
        </div>
      </section>

      <section id="features" className="border-y border-slate-100 bg-white px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-2xl"><p className="text-sm font-black uppercase tracking-[0.16em] text-violet-600">Built for real family life</p><h2 className="mt-3 text-3xl font-black tracking-tight sm:text-5xl">Everything your household needs—without juggling five apps.</h2><p className="mt-4 text-lg font-semibold leading-relaxed text-slate-500">Use the core family tools, then activate optional features as your household grows.</p></div>
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {highlights.map(({ icon: Icon, accent, eyebrow, title, description }) => <article key={title} className="rounded-3xl border border-slate-100 bg-slate-50/70 p-6 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-lg"><div className="flex items-start justify-between gap-4"><div className={`rounded-2xl p-3 ${accent}`}><Icon size={24} /></div><span className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-400">{eyebrow}</span></div><h3 className="mt-5 text-xl font-black">{title}</h3><p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">{description}</p></article>)}
          </div>
          <div className="mt-8 grid gap-3 rounded-3xl bg-slate-900 p-6 text-white sm:grid-cols-2 sm:p-8 lg:grid-cols-3">
            {moreTools.map((tool) => <div key={tool} className="flex items-start gap-2 text-sm font-bold text-slate-200"><Check size={17} className="mt-0.5 shrink-0 text-emerald-400" /> {tool}</div>)}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center"><p className="text-sm font-black uppercase tracking-[0.16em] text-violet-600">Start in minutes</p><h2 className="mt-3 text-3xl font-black sm:text-5xl">Three simple steps to a calmer home</h2></div>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {gettingStarted.map((step) => <div key={step.number} className="relative overflow-hidden rounded-3xl border border-violet-100 bg-white p-7 shadow-sm"><span className="absolute -right-2 -top-5 text-8xl font-black text-violet-50">{step.number}</span><p className="relative text-sm font-black text-violet-600">STEP {step.number}</p><h3 className="relative mt-3 text-xl font-black">{step.title}</h3><p className="relative mt-2 text-sm font-semibold leading-relaxed text-slate-500">{step.description}</p></div>)}
          </div>
          <div className="mt-10 text-center"><Link href="/parent?signup=1" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-8 py-4 text-lg font-black text-white shadow-lg shadow-violet-200 transition-colors hover:bg-violet-700">Start your family setup <ArrowRight size={20} /></Link><p className="mt-3 text-sm font-bold text-slate-400">Already have a household? <Link href="/parent" className="text-violet-600 hover:underline">Sign in here</Link>.</p></div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8">
        <div className="mx-auto grid max-w-6xl items-center gap-10 overflow-hidden rounded-[2rem] bg-violet-600 px-7 py-10 text-white shadow-xl shadow-violet-200 sm:px-12 md:grid-cols-[1fr_auto] md:py-12">
          <div className="max-w-2xl"><div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-black uppercase tracking-widest"><MonitorSmartphone size={15} /> Share from any phone</div><h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Bring someone into ChoresList</h2><p className="mt-3 text-lg font-semibold leading-relaxed text-violet-100">Open your camera and scan the code, or copy the link to send ChoresList to another parent, grandparent, or friend.</p><div className="mt-6 flex flex-wrap gap-3"><Link href="/parent?signup=1" className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-black text-violet-700 hover:bg-violet-50">Sign up and get started <ArrowRight size={18} /></Link><div className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-4 py-3 text-sm font-bold text-violet-100"><Users size={17} /> Easy to share with family</div></div></div>
          <LandingShareQr preferredUrl={publicUrl} />
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white/70 px-5 py-7"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-center text-sm font-bold text-slate-400 sm:flex-row sm:text-left"><span>ChoresList — built for your family 🏠</span><div className="flex items-center gap-4"><Link href="/privacy" className="hover:text-violet-600">Privacy</Link><Link href="/terms" className="hover:text-violet-600">Terms</Link><Link href="/parent" className="hover:text-violet-600">Sign in</Link></div></div></footer>
    </main>
  );
}
