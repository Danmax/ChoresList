"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Gamepad2, Puzzle, RefreshCw, Trophy } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;
};

type Game = {
  key: "memory-match" | "bible-trivia";
  title: string;
  description: string;
  ageMin: number;
  ageMax: number;
  playTime: string;
  color: string;
  bg: string;
};

type GameSetting = {
  gameKey: string;
  enabled: boolean;
  rewardType: "none" | "points" | "tickets";
  rewardPoints: number;
  rewardTickets: number;
  requiresChoresComplete: boolean;
  dailyPlayLimit: number;
};

type Availability = Record<string, {
  playsToday: number;
  openChores: number;
  available: boolean;
  reason: string | null;
}>;

type Reward = {
  type: string;
  points: number;
  tickets: number;
};

const MEMORY_SYMBOLS = ["🧺", "🧹", "🧽", "🪴", "📚", "⭐"];
const TRIVIA = [
  {
    question: "Who built the ark?",
    choices: ["Noah", "Moses", "David", "Peter"],
    answer: "Noah",
  },
  {
    question: "Where was Jesus born?",
    choices: ["Bethlehem", "Jericho", "Nazareth", "Rome"],
    answer: "Bethlehem",
  },
  {
    question: "What did David use when he faced Goliath?",
    choices: ["A sling and stone", "A net", "A trumpet", "A staff"],
    answer: "A sling and stone",
  },
  {
    question: "How many days did God use to create the world before resting?",
    choices: ["Six", "Three", "Seven", "Forty"],
    answer: "Six",
  },
  {
    question: "Who was swallowed by a great fish?",
    choices: ["Jonah", "Joseph", "Daniel", "Samuel"],
    answer: "Jonah",
  },
];

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function iconForGame(key: string) {
  if (key === "bible-trivia") return BookOpen;
  if (key === "memory-match") return Puzzle;
  return Gamepad2;
}

function settingText(setting?: GameSetting) {
  if (!setting || setting.rewardType === "none") return "Play";
  if (setting.rewardType === "points") return `${setting.rewardPoints} pts`;
  return `${setting.rewardTickets} tickets`;
}

export default function KidGamesPage() {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [settings, setSettings] = useState<Record<string, GameSetting>>({});
  const [availability, setAvailability] = useState<Availability>({});
  const [activeGame, setActiveGame] = useState<Game["key"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [reward, setReward] = useState<Reward | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [membersRes, gamesRes] = await Promise.all([
      fetch("/api/members"),
      fetch(`/api/games?memberId=${id}`),
    ]);
    const membersData = await membersRes.json().catch(() => null);
    const members = Array.isArray(membersData) ? membersData : Array.isArray(membersData?.members) ? membersData.members : [];
    setMember(members.find((item: Member) => item.id === id) ?? null);

    const gamesData = await gamesRes.json().catch(() => null);
    if (gamesRes.ok) {
      setGames(Array.isArray(gamesData?.games) ? gamesData.games : []);
      const nextSettings: Record<string, GameSetting> = {};
      for (const setting of Array.isArray(gamesData?.settings) ? gamesData.settings : []) {
        nextSettings[setting.gameKey] = setting;
      }
      setSettings(nextSettings);
      setAvailability(gamesData?.availability ?? {});
    } else {
      toast.error(gamesData?.error ?? "Could not load games");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function recordSession(gameKey: Game["key"], score: number, durationSeconds: number, metadata: Record<string, unknown>) {
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: id, gameKey, score, durationSeconds, metadata }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      toast.error(data?.error ?? "Could not save game");
      await load();
      return;
    }
    setReward(data.reward ?? null);
    setActiveGame(null);
    await load();
  }

  if (loading) return <div className="p-6 text-center font-bold text-slate-400">Loading games...</div>;
  if (!member) return <div className="p-6 text-center font-bold text-slate-400">Player not found.</div>;

  return (
    <div className="min-h-screen p-4 sm:p-6">
      <div className="mb-6 flex items-start gap-3">
        <Link href={`/kid/${id}`} className="mt-1 rounded-2xl bg-white p-2 shadow-sm transition-shadow hover:shadow-md">
          <ArrowLeft size={20} className="text-slate-600" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{member.avatar}</span>
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black text-slate-800 sm:text-3xl">Games</h1>
              <p className="text-sm font-bold text-slate-500">⭐ {member.totalPoints} pts</p>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-2xl bg-white p-2 text-slate-600 shadow-sm transition-shadow hover:shadow-md"
          aria-label="Refresh games"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {reward && (
        <div className="mb-5 rounded-3xl border-2 border-emerald-100 bg-emerald-50 p-4 text-center">
          <p className="text-lg font-black text-emerald-700">
            {reward.points > 0 ? `You earned ${reward.points} points.` : reward.tickets > 0 ? `You earned ${reward.tickets} tickets.` : "Game saved."}
          </p>
        </div>
      )}

      {activeGame === "memory-match" ? (
        <MemoryMatch onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("memory-match", score, duration, metadata)} />
      ) : activeGame === "bible-trivia" ? (
        <BibleTrivia onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("bible-trivia", score, duration, metadata)} />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {games.map((game) => {
            const setting = settings[game.key];
            const status = availability[game.key];
            const Icon = iconForGame(game.key);
            const locked = !status?.available;
            return (
              <button
                key={game.key}
                type="button"
                disabled={locked}
                onClick={() => {
                  setReward(null);
                  setActiveGame(game.key);
                }}
                className="min-h-52 rounded-3xl border-2 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-65"
                style={{ borderColor: locked ? "#e2e8f0" : `${game.color}55` }}
              >
                <span className="mb-4 flex size-14 items-center justify-center rounded-2xl" style={{ backgroundColor: game.bg }}>
                  <Icon size={28} style={{ color: game.color }} />
                </span>
                <span className="block text-xl font-black text-slate-800">{game.title}</span>
                <span className="mt-2 block text-sm font-bold leading-6 text-slate-500">{game.description}</span>
                <span className="mt-4 flex flex-wrap gap-2 text-xs font-black">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">{game.playTime}</span>
                  <span className="rounded-full bg-yellow-50 px-3 py-1 text-yellow-700">{settingText(setting)}</span>
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                    {status ? `${status.playsToday}/${setting?.dailyPlayLimit ?? 0} today` : "Ready"}
                  </span>
                </span>
                {locked && <span className="mt-4 block text-sm font-black text-red-500">{status?.reason ?? "Locked"}</span>}
              </button>
            );
          })}
        </section>
      )}
    </div>
  );
}

function MemoryMatch({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const [cards, setCards] = useState(() => shuffle([...MEMORY_SYMBOLS, ...MEMORY_SYMBOLS]).map((symbol, index) => ({ id: index, symbol, matched: false })));
  const [picked, setPicked] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [finished, setFinished] = useState(false);

  function choose(index: number) {
    if (picked.includes(index) || cards[index].matched || picked.length === 2 || finished) return;
    const nextPicked = [...picked, index];
    setPicked(nextPicked);
    if (nextPicked.length !== 2) return;

    setMoves((value) => value + 1);
    const [first, second] = nextPicked;
    if (cards[first].symbol === cards[second].symbol) {
      const nextCards = cards.map((card, cardIndex) => cardIndex === first || cardIndex === second ? { ...card, matched: true } : card);
      setCards(nextCards);
      setPicked([]);
      if (nextCards.every((card) => card.matched)) {
        setFinished(true);
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        const score = Math.max(10, 140 - (moves + 1) * 5 - duration);
        setTimeout(() => onFinish(score, duration, { moves: moves + 1, pairs: MEMORY_SYMBOLS.length }), 500);
      }
    } else {
      setTimeout(() => setPicked([]), 650);
    }
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><Puzzle className="text-violet-600" /> Memory Match</h2>
          <p className="text-sm font-bold text-slate-500">{moves} moves</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {cards.map((card, index) => {
          const visible = card.matched || picked.includes(index);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => choose(index)}
              className={`aspect-square rounded-2xl text-4xl font-black shadow-sm transition-all ${visible ? "bg-violet-100 text-slate-800" : "bg-slate-800 text-white hover:bg-slate-700"}`}
            >
              {visible ? card.symbol : "?"}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function BibleTrivia({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const questions = useMemo(() => shuffle(TRIVIA).slice(0, 5), []);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState("");
  const [startedAt] = useState(() => Date.now());
  const current = questions[index];

  function answer(choice: string) {
    if (selected) return;
    setSelected(choice);
    const nextCorrect = correct + (choice === current.answer ? 1 : 0);
    setCorrect(nextCorrect);
    setTimeout(() => {
      if (index === questions.length - 1) {
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        onFinish(nextCorrect * 100, duration, { correct: nextCorrect, total: questions.length });
        return;
      }
      setSelected("");
      setIndex((value) => value + 1);
    }, 700);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><BookOpen className="text-teal-700" /> Bible Trivia</h2>
          <p className="text-sm font-bold text-slate-500">Question {index + 1}/{questions.length} · {correct} correct</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>

      <div className="rounded-3xl bg-teal-50 p-5">
        <p className="text-xl font-black leading-8 text-slate-800">{current.question}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {current.choices.map((choice) => {
          const isCorrect = choice === current.answer;
          const active = selected === choice;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => answer(choice)}
              className={`rounded-2xl border-2 bg-white p-4 text-left font-black transition-colors ${
                selected
                  ? isCorrect
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : active
                      ? "border-red-200 bg-red-50 text-red-600"
                      : "border-slate-100 text-slate-400"
                  : "border-slate-100 text-slate-700 hover:border-teal-200 hover:bg-teal-50"
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                {choice}
                {selected && isCorrect && <CheckCircle2 size={18} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-black text-yellow-700">
        <Trophy size={18} /> Score builds with every correct answer.
      </div>
    </section>
  );
}
