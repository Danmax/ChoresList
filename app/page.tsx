import Image from "next/image";
import Link from "next/link";
import { Star, Trophy, DollarSign, Sparkles, ClipboardList, BarChart2, Users, ShoppingCart, MonitorSmartphone, Puzzle, BellRing, HeartHandshake } from "lucide-react";

const features = [
  {
    icon: "✅",
    title: "Flexible Chore Assignments",
    description: "Select and assign several chores at once, then schedule daily, weekly, or one-time work.",
  },
  {
    icon: "⭐",
    title: "Points & Levels",
    description: "Kids earn points for completing chores and level up — Rookie to Legend.",
  },
  {
    icon: "🤖",
    title: "AI Instructions",
    description: "Each chore gets step-by-step how-to instructions generated for your child's age.",
  },
  {
    icon: "📅",
    title: "Family Calendar",
    description: "Plan appointments, vacations, Bible studies, work, sports, rehearsals, training, and recurring activities.",
  },
  {
    icon: "💵",
    title: "Allowance Tracker",
    description: "Automatically calculate weekly allowances based on points earned.",
  },
  {
    icon: "🔧",
    title: "House Projects",
    description: "Create bigger household projects with reward tickets kids can redeem.",
  },
  {
    icon: "🎁",
    title: "Wish List",
    description: "Kids add items to their wish list and parents can track what they want.",
  },
  {
    icon: "🛒",
    title: "Grocery Lists",
    description: "Create recurring lists with item descriptions and units, mark pantry items on hand, and upload receipts.",
  },
  {
    icon: "📺",
    title: "Kid Screens",
    description: "Pair dedicated task boards so kids can check chores from a shared screen.",
  },
  {
    icon: "👥",
    title: "Community Events",
    description: "Manage groups, calendars, advanced recurring meetings, RSVPs, registrations, potlucks, and online links.",
  },
  {
    icon: "📝",
    title: "Community Surveys",
    description: "Publish polls, feedback forms, and personality surveys, then surface open surveys where members can find them.",
  },
  {
    icon: "🔔",
    title: "Event Notifications",
    description: "Send assignment and registration emails, event reminders, and weekly manager summaries.",
  },
  {
    icon: "📊",
    title: "Reports",
    description: "Review chore completion feedback, completion rates, points history, and skill growth over time.",
  },
  {
    icon: "💗",
    title: "Private Wellbeing Check-ins",
    description: "Give family members a private way to share how they are doing without points, rankings, or public comparisons.",
  },
  {
    icon: "🌳",
    title: "Family Tree",
    description: "Map parents, grandparents, guardians, partners, and family branches in one visual family view.",
  },
];

const optionalPlugins = [
  { icon: "🛒", title: "Grocery & Pantry", description: "Recurring lists, pantry status, detailed items, and receipt photos." },
  { icon: "👥", title: "Community Events", description: "Groups, events, RSVP, potlucks, classes, badges, and community calendars." },
  { icon: "🎓", title: "Learning & Badges", description: "Skills, tests, projects, passing scores, XP, and merit badges." },
  { icon: "🍲", title: "Recipes", description: "Save recipes, preparation instructions, photos, and shopping-list ingredients." },
  { icon: "🌳", title: "Family Tree", description: "Create a visual family diagram with relatives, guardians, partners, and branches." },
  { icon: "💗", title: "Emotional Wellbeing", description: "Private qualitative check-ins with no points, rankings, or public comparisons." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
          <Image
            src="/logo.png"
            alt="ChoresList"
            width={160}
            height={160}
            priority
            className="mx-auto mb-6 h-32 w-32 sm:h-40 sm:w-40 rounded-3xl object-contain"
          />
          <h1 className="text-5xl sm:text-6xl font-black text-slate-800 mb-4 leading-tight">
            ChoresList
          </h1>
          <p className="text-xl sm:text-2xl font-semibold text-slate-500 mb-3">
            Make chores fun for the whole family
          </p>
          <p className="text-slate-400 text-base sm:text-lg mb-10 max-w-xl mx-auto">
            Assign chores, coordinate schedules, plan shopping, run community surveys, support family wellbeing, and activate only the tools you need.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 bg-violet-500 text-white rounded-2xl px-8 py-4 text-lg font-black hover:bg-violet-600 transition-colors shadow-lg shadow-violet-200"
            >
              <Users size={20} /> Family Dashboard
            </Link>
            <Link
              href="/parent"
              className="flex items-center justify-center gap-2 bg-white text-slate-700 rounded-2xl px-8 py-4 text-lg font-black hover:bg-slate-50 transition-colors shadow-sm border border-slate-100"
            >
              <ClipboardList size={20} /> Parent Panel
            </Link>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white/60 backdrop-blur border-y border-slate-100 py-6">
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-2 gap-4 text-center sm:grid-cols-4">
          {[
            { icon: <Trophy size={22} className="text-yellow-500" />, label: "Points & Levels" },
            { icon: <Sparkles size={22} className="text-violet-500" />, label: "AI Instructions" },
            { icon: <DollarSign size={22} className="text-emerald-500" />, label: "Allowance Tracking" },
            { icon: <ShoppingCart size={22} className="text-green-500" />, label: "Grocery Lists" },
            { icon: <MonitorSmartphone size={22} className="text-indigo-500" />, label: "Kid Screens" },
            { icon: <Puzzle size={22} className="text-slate-500" />, label: "Optional Plugins" },
            { icon: <BellRing size={22} className="text-blue-500" />, label: "Event Reminders" },
            { icon: <HeartHandshake size={22} className="text-pink-500" />, label: "Private Check-ins" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              {icon}
              <span className="text-xs sm:text-sm font-bold text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border-y border-violet-100 bg-violet-50/60 px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-black text-violet-600 shadow-sm">
              <Puzzle size={17} /> Feature Plugins
            </div>
            <h2 className="text-3xl font-black text-slate-800">Use the tools your household needs</h2>
            <p className="mt-3 font-semibold text-slate-500">Household owners can activate or deactivate optional features. Turning one off hides it and stops its scheduled work while preserving existing data.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {optionalPlugins.map((plugin) => (
              <div key={plugin.title} className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
                <div className="mb-3 text-3xl">{plugin.icon}</div>
                <h3 className="font-black text-slate-800">{plugin.title}</h3>
                <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-400">{plugin.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-slate-800 text-center mb-10">Everything your family needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow border border-slate-50"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-black text-slate-800 mb-1.5 text-sm">{f.title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-violet-500 text-white py-16 px-6 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-3xl font-black mb-3">Ready to get started?</h2>
        <p className="text-violet-200 mb-8 text-lg">Add family members, assign chores, and activate the features that fit your household.</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 bg-white text-violet-600 rounded-2xl px-8 py-4 text-lg font-black hover:bg-violet-50 transition-colors"
          >
            <Star size={20} /> View Dashboard
          </Link>
          <Link
            href="/parent"
            className="flex items-center justify-center gap-2 bg-violet-600 text-white rounded-2xl px-8 py-4 text-lg font-black hover:bg-violet-700 transition-colors border border-violet-400"
          >
            <BarChart2 size={20} /> Parent Panel
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm font-semibold text-slate-400 sm:flex-row">
        <span>ChoresList — built for your family 🏠</span>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <Link href="/privacy" className="hover:text-violet-500">
          Privacy Policy
        </Link>
        <span className="hidden text-slate-300 sm:inline">•</span>
        <Link href="/terms" className="hover:text-violet-500">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
