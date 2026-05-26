import Image from "next/image";
import Link from "next/link";
import { Star, Trophy, Calendar, DollarSign, Sparkles, ClipboardList, Gift, Wrench, BarChart2, Users } from "lucide-react";

const features = [
  {
    icon: "✅",
    title: "Chore Assignments",
    description: "Assign daily, weekly, or one-time chores to each family member with custom schedules.",
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
    description: "Track family events, recurring activities, and chore due dates in one place.",
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
    icon: "📊",
    title: "Reports",
    description: "See completion rates, points history, and skill growth over time.",
  },
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
            Assign chores, earn points, level up, and track allowances — all in one cheerful family app.
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
        <div className="max-w-3xl mx-auto px-6 grid grid-cols-3 gap-4 text-center">
          {[
            { icon: <Trophy size={22} className="text-yellow-500" />, label: "Points & Levels" },
            { icon: <Sparkles size={22} className="text-violet-500" />, label: "AI Instructions" },
            { icon: <DollarSign size={22} className="text-emerald-500" />, label: "Allowance Tracking" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              {icon}
              <span className="text-xs sm:text-sm font-bold text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-black text-slate-800 text-center mb-10">Everything your family needs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <p className="text-violet-200 mb-8 text-lg">Jump into the parent panel to add your family members and assign first chores.</p>
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
      <div className="text-center py-6 text-slate-400 text-sm font-semibold">
        ChoresList — built for your family 🏠
      </div>
    </div>
  );
}
