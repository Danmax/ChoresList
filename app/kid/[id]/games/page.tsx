"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, FileText, Gamepad2, Grid3X3, KeyRound, Puzzle, RefreshCw, Scissors, Shapes, Swords, Trophy } from "lucide-react";
import { toast } from "sonner";

type Member = {
  id: string;
  name: string;
  avatar: string;
  color: string;
  totalPoints: number;
  age: number;
};

type Game = {
  key: "memory-match" | "bible-trivia" | "rock-paper-scissors-shoot" | "shape-safari" | "codebreaker-quest" | "tic-tac-toe";
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

const MEMORY_THEMES = [
  { name: "Around the House", symbols: ["🧺", "🧹", "🧽", "🪴", "📚", "🛏️", "🧸", "🕯️"] },
  { name: "Animal Friends", symbols: ["🐶", "🐱", "🦊", "🐼", "🦁", "🐸", "🐧", "🦋"] },
  { name: "Tasty Treats", symbols: ["🍎", "🍕", "🍓", "🥨", "🧁", "🍉", "🥕", "🍪"] },
  { name: "Space Trip", symbols: ["🚀", "🪐", "🌙", "⭐", "👽", "🛰️", "☄️", "🌍"] },
  { name: "Great Outdoors", symbols: ["🌻", "🌈", "🌲", "🍄", "🌊", "⛰️", "🐚", "☀️"] },
  { name: "Game Day", symbols: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🥏", "🏓"] },
];
const RPS_CHOICES = [
  { key: "rock", label: "Rock", color: "text-slate-700", bg: "bg-slate-100", beats: "scissors" },
  { key: "paper", label: "Paper", color: "text-blue-700", bg: "bg-blue-50", beats: "rock" },
  { key: "scissors", label: "Scissors", color: "text-red-700", bg: "bg-red-50", beats: "paper" },
] as const;
type TriviaLevel = "Explorer" | "Adventurer" | "Scholar";
type TriviaQuestion = { question: string; choices: string[]; answer: string };
const TRIVIA_BY_LEVEL: Record<TriviaLevel, TriviaQuestion[]> = {
  Explorer: [
    { question: "Who built the ark?", choices: ["Noah", "Moses", "David", "Peter"], answer: "Noah" },
    { question: "Where was Jesus born?", choices: ["Bethlehem", "Jericho", "Nazareth", "Rome"], answer: "Bethlehem" },
    { question: "What did David use against Goliath?", choices: ["A sling and stone", "A net", "A trumpet", "A staff"], answer: "A sling and stone" },
    { question: "Who was swallowed by a great fish?", choices: ["Jonah", "Joseph", "Daniel", "Samuel"], answer: "Jonah" },
    { question: "Who was protected in the lions’ den?", choices: ["Daniel", "Noah", "Peter", "Isaac"], answer: "Daniel" },
    { question: "Who led God’s people through the Red Sea?", choices: ["Moses", "David", "Paul", "Abraham"], answer: "Moses" },
    { question: "What is the first book of the Bible?", choices: ["Genesis", "Matthew", "Psalms", "Exodus"], answer: "Genesis" },
    { question: "How many disciples did Jesus choose?", choices: ["12", "7", "10", "20"], answer: "12" },
    { question: "What was the name of Jesus’ mother?", choices: ["Mary", "Ruth", "Esther", "Martha"], answer: "Mary" },
    { question: "What did Jesus turn water into?", choices: ["Wine", "Milk", "Oil", "Juice"], answer: "Wine" },
  ],
  Adventurer: [
    { question: "Which king was known for asking God for wisdom?", choices: ["Solomon", "Saul", "Ahab", "Herod"], answer: "Solomon" },
    { question: "Whose walls fell after Israel marched around them?", choices: ["Jericho", "Bethlehem", "Nineveh", "Damascus"], answer: "Jericho" },
    { question: "Who was Ruth’s mother-in-law?", choices: ["Naomi", "Hannah", "Miriam", "Deborah"], answer: "Naomi" },
    { question: "Who received a special coat from his father?", choices: ["Joseph", "Joshua", "Jacob", "Jonathan"], answer: "Joseph" },
    { question: "What was connected to Samson’s great strength?", choices: ["His uncut hair", "His sandals", "His shield", "His crown"], answer: "His uncut hair" },
    { question: "Which disciple had been a tax collector?", choices: ["Matthew", "Andrew", "John", "Thomas"], answer: "Matthew" },
    { question: "Where did Jesus teach the Beatitudes?", choices: ["On a mountainside", "In a palace", "On a ship", "In Rome"], answer: "On a mountainside" },
    { question: "Who interpreted Pharaoh’s dreams in Egypt?", choices: ["Joseph", "Aaron", "Samuel", "Elijah"], answer: "Joseph" },
    { question: "Which queen bravely spoke up for her people?", choices: ["Esther", "Jezebel", "Bathsheba", "Candace"], answer: "Esther" },
    { question: "What happened when Paul and Silas sang in prison?", choices: ["An earthquake opened the doors", "It began to rain", "The lights went out", "A ship arrived"], answer: "An earthquake opened the doors" },
  ],
  Scholar: [
    { question: "On what road did Saul encounter Jesus?", choices: ["The road to Damascus", "The road to Jericho", "The Emmaus road", "The Appian Way"], answer: "The road to Damascus" },
    { question: "Which book lists the fruit of the Spirit?", choices: ["Galatians", "Genesis", "Hebrews", "Revelation"], answer: "Galatians" },
    { question: "Who was chosen to replace Judas among the twelve?", choices: ["Matthias", "Barnabas", "Silas", "Timothy"], answer: "Matthias" },
    { question: "On which island did John receive the Revelation?", choices: ["Patmos", "Crete", "Cyprus", "Malta"], answer: "Patmos" },
    { question: "Who is remembered as the first Christian martyr?", choices: ["Stephen", "James", "Philip", "Mark"], answer: "Stephen" },
    { question: "Lydia was a seller of what?", choices: ["Purple cloth", "Olive oil", "Spices", "Pottery"], answer: "Purple cloth" },
    { question: "Who was Priscilla’s husband?", choices: ["Aquila", "Apollos", "Festus", "Titus"], answer: "Aquila" },
    { question: "Which king ordered Daniel into the lions’ den?", choices: ["Darius", "Solomon", "Herod", "Josiah"], answer: "Darius" },
    { question: "In which letter is the armor of God described?", choices: ["Ephesians", "Romans", "Philippians", "Colossians"], answer: "Ephesians" },
    { question: "Who explained the Scriptures to the Ethiopian official?", choices: ["Philip", "Peter", "Luke", "Barnabas"], answer: "Philip" },
  ],
};

function shuffle<T>(items: T[]) {
  return [...items].sort(() => Math.random() - 0.5);
}

function iconForGame(key: string) {
  if (key === "rock-paper-scissors-shoot") return Swords;
  if (key === "bible-trivia") return BookOpen;
  if (key === "memory-match") return Puzzle;
  if (key === "shape-safari") return Shapes;
  if (key === "codebreaker-quest") return KeyRound;
  if (key === "tic-tac-toe") return Grid3X3;
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
        <BibleTrivia age={member.age} onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("bible-trivia", score, duration, metadata)} />
      ) : activeGame === "rock-paper-scissors-shoot" ? (
        <RockPaperScissorsShoot onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("rock-paper-scissors-shoot", score, duration, metadata)} />
      ) : activeGame === "shape-safari" ? (
        <ShapeSafari onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("shape-safari", score, duration, metadata)} />
      ) : activeGame === "codebreaker-quest" ? (
        <CodebreakerQuest onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("codebreaker-quest", score, duration, metadata)} />
      ) : activeGame === "tic-tac-toe" ? (
        <TicTacToe onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("tic-tac-toe", score, duration, metadata)} />
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

function choiceIcon(choice: string) {
  if (choice === "paper") return FileText;
  if (choice === "scissors") return Scissors;
  return Circle;
}

function RockPaperScissorsShoot({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  type ChoiceKey = typeof RPS_CHOICES[number]["key"];
  const [phase, setPhase] = useState<"player-one" | "player-two" | "result">("player-one");
  const [playerOneChoice, setPlayerOneChoice] = useState<ChoiceKey | null>(null);
  const [playerTwoChoice, setPlayerTwoChoice] = useState<ChoiceKey | null>(null);
  const [round, setRound] = useState(1);
  const [score, setScore] = useState({ playerOne: 0, playerTwo: 0, ties: 0 });
  const [startedAt] = useState(() => Date.now());

  const result = useMemo(() => {
    if (!playerOneChoice || !playerTwoChoice) return null;
    if (playerOneChoice === playerTwoChoice) return "tie";
    const playerOne = RPS_CHOICES.find((choice) => choice.key === playerOneChoice);
    return playerOne?.beats === playerTwoChoice ? "player-one" : "player-two";
  }, [playerOneChoice, playerTwoChoice]);

  function choose(choice: ChoiceKey) {
    if (phase === "player-one") {
      setPlayerOneChoice(choice);
      setPhase("player-two");
      return;
    }
    if (phase !== "player-two") return;
    setPlayerTwoChoice(choice);
    setScore((current) => {
      if (!playerOneChoice || playerOneChoice === choice) return { ...current, ties: current.ties + 1 };
      const playerOne = RPS_CHOICES.find((item) => item.key === playerOneChoice);
      return playerOne?.beats === choice
        ? { ...current, playerOne: current.playerOne + 1 }
        : { ...current, playerTwo: current.playerTwo + 1 };
    });
    setPhase("result");
  }

  function nextRound() {
    setPlayerOneChoice(null);
    setPlayerTwoChoice(null);
    setRound((value) => value + 1);
    setPhase("player-one");
  }

  function saveGame() {
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const sessionScore = score.playerOne * 100 + score.ties * 25;
    onFinish(sessionScore, duration, { rounds: round, playerOneWins: score.playerOne, playerTwoWins: score.playerTwo, ties: score.ties });
  }

  const activePlayer = phase === "player-one" ? "Player 1" : "Player 2";
  const canSave = phase === "result";

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><Swords className="text-red-600" /> Rock Paper Scissors Shoot</h2>
          <p className="text-sm font-bold text-slate-500">Round {round} · Player 1 {score.playerOne} · Player 2 {score.playerTwo} · Ties {score.ties}</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>

      {phase === "result" && result ? (
        <div className="rounded-3xl bg-red-50 p-5">
          <p className="text-center text-sm font-black uppercase tracking-wide text-red-500">Shoot</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <ChoiceReveal label="Player 1" choice={playerOneChoice ?? "rock"} />
            <ChoiceReveal label="Player 2" choice={playerTwoChoice ?? "rock"} />
          </div>
          <p className="mt-5 text-center text-2xl font-black text-slate-800">
            {result === "tie" ? "Tie round" : result === "player-one" ? "Player 1 wins" : "Player 2 wins"}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={nextRound} className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-black text-white">Next Round</button>
            <button type="button" onClick={saveGame} disabled={!canSave} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Save Game</button>
          </div>
        </div>
      ) : (
        <div>
          <div className="rounded-3xl bg-red-50 p-5 text-center">
            <p className="text-sm font-black uppercase tracking-wide text-red-500">{activePlayer}'s turn</p>
            <p className="mt-2 text-xl font-black leading-8 text-slate-800">
              {phase === "player-one" ? "Choose secretly, then pass the device." : "Player 1 is locked in. Choose your shot."}
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {RPS_CHOICES.map((choice) => {
              const Icon = choiceIcon(choice.key);
              return (
                <button
                  key={choice.key}
                  type="button"
                  onClick={() => choose(choice.key)}
                  className={`min-h-36 rounded-3xl border-2 border-slate-100 ${choice.bg} p-4 text-center transition-all hover:-translate-y-0.5 hover:border-red-200`}
                >
                  <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white">
                    <Icon size={28} className={choice.color} />
                  </span>
                  <span className="mt-3 block text-lg font-black text-slate-800">{choice.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function ChoiceReveal({ label, choice }: { label: string; choice: string }) {
  const Icon = choiceIcon(choice);
  const option = RPS_CHOICES.find((item) => item.key === choice) ?? RPS_CHOICES[0];
  return (
    <div className="rounded-3xl bg-white p-4 text-center">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <span className={`mx-auto mt-3 flex size-16 items-center justify-center rounded-2xl ${option.bg}`}>
        <Icon size={32} className={option.color} />
      </span>
      <p className="mt-3 text-lg font-black text-slate-800">{option.label}</p>
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
  const [theme] = useState(() => MEMORY_THEMES[Math.floor(Math.random() * MEMORY_THEMES.length)]);
  const [cards, setCards] = useState(() => shuffle([...theme.symbols, ...theme.symbols]).map((symbol, index) => ({ id: index, symbol, matched: false })));
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
        const score = Math.max(10, 220 - (moves + 1) * 5 - duration);
        setTimeout(() => onFinish(score, duration, { moves: moves + 1, pairs: theme.symbols.length, theme: theme.name }), 500);
      }
    } else {
      setTimeout(() => setPicked([]), 650);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><Puzzle className="text-violet-600" /> Memory Match</h2>
          <p className="text-sm font-bold text-slate-500">{theme.name} · {moves} moves</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>
      <div className="mx-auto grid w-full max-w-lg grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, index) => {
          const visible = card.matched || picked.includes(index);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => choose(index)}
              className={`aspect-square rounded-xl text-3xl font-black shadow-sm transition-all sm:rounded-2xl sm:text-4xl ${visible ? "bg-violet-100 text-slate-800" : "bg-slate-800 text-white hover:bg-slate-700"}`}
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
  age,
  onExit,
  onFinish,
}: {
  age: number;
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const level: TriviaLevel = age <= 8 ? "Explorer" : age <= 12 ? "Adventurer" : "Scholar";
  const questions = useMemo(() => shuffle(TRIVIA_BY_LEVEL[level]).slice(0, 8), [level]);
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
        onFinish(nextCorrect * 100, duration, { correct: nextCorrect, total: questions.length, level });
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
          <p className="text-sm font-bold text-slate-500">{level} · Question {index + 1}/{questions.length} · {correct} correct</p>
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

const SAFARI_ROUNDS = [
  { prompt: "Find the sunny yellow circle!", answer: "🟡", choices: ["🟡", "🟦", "🔺", "🟩"] },
  { prompt: "Which one is a triangle?", answer: "🔺", choices: ["🟣", "🔺", "🟨", "⚪"] },
  { prompt: "Tap the green square!", answer: "🟩", choices: ["🟩", "🔴", "🔷", "⭐"] },
  { prompt: "Can you spot the blue diamond?", answer: "🔷", choices: ["🟧", "🔷", "🟢", "🔺"] },
  { prompt: "Find the twinkly star!", answer: "⭐", choices: ["🟦", "⭐", "🟠", "🟩"] },
];

function ShapeSafari({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const rounds = useMemo(() => shuffle(SAFARI_ROUNDS), []);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState("");
  const [startedAt] = useState(() => Date.now());
  const current = rounds[index];

  function choose(choice: string) {
    if (selected) return;
    setSelected(choice);
    const nextCorrect = correct + (choice === current.answer ? 1 : 0);
    setCorrect(nextCorrect);
    setTimeout(() => {
      if (index === rounds.length - 1) {
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        onFinish(nextCorrect * 100, duration, { correct: nextCorrect, total: rounds.length });
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
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><Shapes className="text-orange-600" /> Shape Safari</h2>
          <p className="text-sm font-bold text-slate-500">Stop {index + 1}/{rounds.length} · {correct} found</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>
      <div className="rounded-3xl bg-orange-50 p-6 text-center">
        <span className="text-5xl" aria-hidden="true">🦁</span>
        <p className="mt-3 text-2xl font-black text-slate-800">{current.prompt}</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {current.choices.map((choice) => {
          const isCorrect = choice === current.answer;
          const isSelected = choice === selected;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => choose(choice)}
              className={`aspect-square rounded-3xl border-2 text-5xl shadow-sm transition-all ${selected ? isCorrect ? "border-emerald-300 bg-emerald-50" : isSelected ? "border-red-200 bg-red-50" : "border-slate-100 opacity-50" : "border-orange-100 bg-white hover:-translate-y-0.5 hover:border-orange-300"}`}
              aria-label={`Choose ${choice}`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex items-center gap-2 rounded-2xl bg-yellow-50 px-4 py-3 text-sm font-black text-yellow-700">
        <Trophy size={18} /> Every answer is a safari discovery!
      </div>
    </section>
  );
}

const CODEBREAKER_PUZZLES = [
  { lock: "Pattern lock", clue: "2, 6, 12, 20, ?", choices: ["28", "30", "32", "36"], answer: "30", hint: "The gaps grow by 2 each time." },
  { lock: "Cipher lock", clue: "If A = 1, B = 2, and C = 3, what is CAB?", choices: ["123", "312", "321", "213"], answer: "312", hint: "Turn each letter into its number." },
  { lock: "Logic lock", clue: "Mia is taller than Jay. Jay is taller than Sol. Who is shortest?", choices: ["Mia", "Jay", "Sol", "Not enough clues"], answer: "Sol", hint: "Put the three people in height order." },
  { lock: "Word lock", clue: "Unscramble: R T E S A U E R", choices: ["Treasure", "Restaurant", "Rescuer", "Eraser"], answer: "Treasure", hint: "It is what you hope to find at the end of a quest." },
  { lock: "Number lock", clue: "A key costs 7 coins. You have 25 coins. How many are left after buying 3 keys?", choices: ["4", "5", "6", "7"], answer: "4", hint: "Find the cost of 3 keys, then subtract." },
  { lock: "Symbol lock", clue: "▲ ● ▲ ● ▲ ?", choices: ["▲", "●", "■", "★"], answer: "●", hint: "The symbols take turns." },
  { lock: "Code lock", clue: "Move each letter forward one: DPEF becomes…", choices: ["CODE", "COLD", "DOOR", "COVE"], answer: "CODE", hint: "D becomes C when you move back one." },
  { lock: "Logic lock", clue: "The blue box is not first. The red box is after the green box. Which can be first?", choices: ["Blue", "Red", "Green", "None"], answer: "Green", hint: "Use both clues to eliminate choices." },
];

function CodebreakerQuest({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const puzzles = useMemo(() => shuffle(CODEBREAKER_PUZZLES).slice(0, 5), []);
  const [index, setIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [selected, setSelected] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [startedAt] = useState(() => Date.now());
  const current = puzzles[index];

  function choose(choice: string) {
    if (selected) return;
    setSelected(choice);
    const nextCorrect = correct + (choice === current.answer ? 1 : 0);
    setCorrect(nextCorrect);
    setTimeout(() => {
      if (index === puzzles.length - 1) {
        const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        onFinish(nextCorrect * 100 + Math.max(0, 90 - duration), duration, { correct: nextCorrect, total: puzzles.length });
        return;
      }
      setSelected("");
      setShowHint(false);
      setIndex((value) => value + 1);
    }, 900);
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><KeyRound className="text-blue-600" /> Codebreaker Quest</h2>
          <p className="text-sm font-bold text-slate-500">Lock {index + 1}/{puzzles.length} · {correct} cracked</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>
      <div className="rounded-3xl bg-blue-950 p-6 text-center text-white">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">{current.lock}</p>
        <p className="mt-3 text-xl font-black leading-8 sm:text-2xl">{current.clue}</p>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {current.choices.map((choice) => {
          const isCorrect = choice === current.answer;
          const isSelected = choice === selected;
          return (
            <button
              key={choice}
              type="button"
              onClick={() => choose(choice)}
              className={`rounded-2xl border-2 p-4 text-left font-black transition-all ${selected ? isCorrect ? "border-emerald-300 bg-emerald-50 text-emerald-700" : isSelected ? "border-red-200 bg-red-50 text-red-600" : "border-slate-100 text-slate-400" : "border-slate-100 bg-white text-slate-700 hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50"}`}
            >
              {choice}
            </button>
          );
        })}
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-amber-50 px-4 py-3">
        <span className="text-sm font-bold text-amber-800">{showHint ? current.hint : "Need a clue? Hints are free."}</span>
        <button type="button" onClick={() => setShowHint(true)} disabled={showHint || Boolean(selected)} className="rounded-xl bg-amber-200 px-3 py-1.5 text-xs font-black text-amber-900 disabled:opacity-50">Reveal hint</button>
      </div>
    </section>
  );
}

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function TicTacToe({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  type Mark = "X" | "O";
  const [board, setBoard] = useState<Array<Mark | null>>(() => Array(9).fill(null));
  const [turn, setTurn] = useState<Mark>("X");
  const [startedAt] = useState(() => Date.now());
  const winner = useMemo(() => {
    const line = WINNING_LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]);
    return line ? board[line[0]] : null;
  }, [board]);
  const isDraw = !winner && board.every(Boolean);
  const complete = Boolean(winner || isDraw);

  function choose(index: number) {
    if (board[index] || complete) return;
    setBoard((current) => current.map((mark, markIndex) => markIndex === index ? turn : mark));
    setTurn((current) => current === "X" ? "O" : "X");
  }

  function newRound() {
    setBoard(Array(9).fill(null));
    setTurn("X");
  }

  function saveGame() {
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    onFinish(winner === "X" ? 100 : isDraw ? 50 : 25, duration, { winner: winner ?? "draw", moves: board.filter(Boolean).length });
  }

  return (
    <section className="rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><Grid3X3 className="text-pink-700" /> Tic-Tac-Toe</h2>
          <p className="text-sm font-bold text-slate-500">{complete ? winner ? `${winner} wins this round!` : "It’s a draw!" : `Player ${turn}'s turn`}</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-2 rounded-3xl bg-pink-50 p-3">
        {board.map((mark, index) => (
          <button
            key={index}
            type="button"
            onClick={() => choose(index)}
            disabled={Boolean(mark) || complete}
            className={`aspect-square rounded-2xl bg-white text-5xl font-black shadow-sm transition-all disabled:cursor-default ${!mark && !complete ? "hover:-translate-y-0.5 hover:bg-pink-100" : ""} ${mark === "X" ? "text-pink-600" : "text-blue-600"}`}
            aria-label={mark ? `Square ${index + 1}: ${mark}` : `Choose square ${index + 1}`}
          >
            {mark}
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={newRound} className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-700">New Round</button>
        <button type="button" onClick={saveGame} disabled={!complete} className="rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50">Save Game</button>
      </div>
    </section>
  );
}
