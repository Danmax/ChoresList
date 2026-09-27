"use client";

import { type DragEvent, type MouseEvent as ReactMouseEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen, CheckCircle2, ChefHat, Circle, FileText, Gamepad2, Grid3X3, KeyRound, Puzzle, RefreshCw, Scissors, Shapes, Swords, TreePine, Trophy } from "lucide-react";
import { toast } from "sonner";
import { MemberAvatar } from "@/components/member-avatar";

type Member = {
  id: string;
  name: string;
  avatar: string;
  avatarConfig?: unknown;
  avatarImageUrl?: string | null;
  color: string;
  totalPoints: number;
  age: number;
};

type Game = {
  key: "memory-match" | "bible-trivia" | "rock-paper-scissors-shoot" | "shape-safari" | "codebreaker-quest" | "tic-tac-toe" | "burger-rush" | "jungle-vine-swing";
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
  if (key === "burger-rush") return ChefHat;
  if (key === "jungle-vine-swing") return TreePine;
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
            <MemberAvatar avatar={member.avatar} avatarConfig={member.avatarConfig} avatarImageUrl={member.avatarImageUrl} name={member.name} className="h-14 w-14 shrink-0 rounded-2xl" />
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
      ) : activeGame === "burger-rush" ? (
        <BurgerRush onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("burger-rush", score, duration, metadata)} />
      ) : activeGame === "jungle-vine-swing" ? (
        <JungleVineSwing onExit={() => setActiveGame(null)} onFinish={(score, duration, metadata) => recordSession("jungle-vine-swing", score, duration, metadata)} />
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

const BURGER_INGREDIENTS = [
  { key: "bottom-bun", label: "Bottom Bun", sprite: [1, 0] },
  { key: "patty", label: "Patty", sprite: [2, 0] },
  { key: "cheese", label: "Cheese", sprite: [3, 0] },
  { key: "lettuce", label: "Lettuce", sprite: [0, 1] },
  { key: "tomato", label: "Tomato", sprite: [1, 1] },
  { key: "pickles", label: "Pickles", sprite: [2, 1] },
  { key: "onion", label: "Onions", sprite: [3, 1] },
  { key: "bacon", label: "Bacon", sprite: [0, 2] },
  { key: "hot-chilies", label: "Hot Chilies", sprite: [1, 2] },
  { key: "sauce", label: "Sauce", sprite: [2, 2] },
  { key: "top-bun", label: "Top Bun", sprite: [0, 0] },
] as const;

type BurgerIngredient = typeof BURGER_INGREDIENTS[number]["key"];
type BurgerOrder = { id: string; customer: string; name: string; ingredients: BurgerIngredient[]; special?: boolean };
type PlacedIngredient = { ingredient: BurgerIngredient; offset: number };

const BURGER_ORDERS: BurgerOrder[] = [
  { id: "classic", customer: "Mia", name: "Classic Cheeseburger", ingredients: ["bottom-bun", "sauce", "patty", "cheese", "top-bun"] },
  { id: "garden", customer: "Jay", name: "Garden Burger", ingredients: ["bottom-bun", "lettuce", "tomato", "onion", "pickles", "top-bun"] },
  { id: "bacon", customer: "Avery", name: "Bacon Stack", special: true, ingredients: ["bottom-bun", "sauce", "patty", "cheese", "bacon", "top-bun"] },
  { id: "chili", customer: "Kai", name: "Hot Chili Special", special: true, ingredients: ["bottom-bun", "sauce", "patty", "cheese", "onion", "hot-chilies", "top-bun"] },
  { id: "double", customer: "Noah", name: "Double Bacon Burger", special: true, ingredients: ["bottom-bun", "sauce", "patty", "cheese", "patty", "bacon", "top-bun"] },
  { id: "deluxe", customer: "Zoe", name: "Everything Deluxe", special: true, ingredients: ["bottom-bun", "lettuce", "patty", "cheese", "bacon", "tomato", "onion", "pickles", "sauce", "top-bun"] },
  { id: "fresh", customer: "Leo", name: "Fresh & Crunchy", ingredients: ["bottom-bun", "sauce", "lettuce", "patty", "tomato", "onion", "pickles", "top-bun"] },
];

function burgerIngredient(key: BurgerIngredient) {
  return BURGER_INGREDIENTS.find((ingredient) => ingredient.key === key) ?? BURGER_INGREDIENTS[0];
}

function BurgerIngredientArt({ ingredient, className = "h-16 w-16" }: { ingredient: BurgerIngredient; className?: string }) {
  const [column, row] = burgerIngredient(ingredient).sprite;
  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 bg-no-repeat ${className}`}
      style={{
        backgroundImage: "url('/games/burger-rush-ingredients.png')",
        backgroundSize: "400% 300%",
        backgroundPosition: `${column * (100 / 3)}% ${row * 50}%`,
      }}
    />
  );
}

function burgerOrderSeconds(order: BurgerOrder) {
  return 14 + order.ingredients.length * 2;
}

function BurgerRush({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const orders = useMemo(() => {
    const bacon = BURGER_ORDERS.find((order) => order.id === "bacon")!;
    const chili = BURGER_ORDERS.find((order) => order.id === "chili")!;
    const rest = BURGER_ORDERS.filter((order) => order.id !== "bacon" && order.id !== "chili");
    return shuffle([bacon, chili, ...shuffle(rest).slice(0, 3)]);
  }, []);
  const [orderIndex, setOrderIndex] = useState(0);
  const [built, setBuilt] = useState<PlacedIngredient[]>([]);
  const [completed, setCompleted] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [feedback, setFeedback] = useState("Drag the bottom bun onto the work canvas!");
  const [serving, setServing] = useState(false);
  const [celebrating, setCelebrating] = useState(false);
  const [tipped, setTipped] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<BurgerIngredient | null>(null);
  const [startedAt] = useState(() => Date.now());
  const current = orders[orderIndex];
  const [timeLeft, setTimeLeft] = useState(() => burgerOrderSeconds(current));
  const timedOutOrder = useRef<number | null>(null);
  const sendingBurger = serving && !tipped && !celebrating && built.length === current.ingredients.length;
  const offsets = built.map((item) => item.offset);
  const stackSpread = offsets.length > 1 ? Math.max(...offsets) - Math.min(...offsets) : 0;
  const stability = Math.max(0, Math.round(100 - stackSpread * 0.72));

  function finishShift(customersServed: number, mistakeCount: number) {
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    const score = Math.max(25, customersServed * 120 + Math.max(0, 180 - duration) - mistakeCount * 20);
    onFinish(score, duration, { customersServed, mistakes: mistakeCount, orders: orders.map((order) => order.id) });
  }

  function moveToNextOrder(customersServed: number, mistakeCount: number, message = "New ticket! Drag the bottom bun onto the canvas.") {
    if (orderIndex === orders.length - 1) {
      finishShift(customersServed, mistakeCount);
      return;
    }
    const nextIndex = orderIndex + 1;
    setOrderIndex(nextIndex);
    setBuilt([]);
    setSelectedIngredient(null);
    setFeedback(message);
    setTimeLeft(burgerOrderSeconds(orders[nextIndex]));
    setServing(false);
    setCelebrating(false);
    setTipped(false);
  }

  useEffect(() => {
    if (serving || timeLeft <= 0) return;
    const timer = window.setTimeout(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [timeLeft, serving]);

  useEffect(() => {
    if (timeLeft > 0 || serving || timedOutOrder.current === orderIndex) return;
    timedOutOrder.current = orderIndex;
    const nextMistakes = mistakes + 1;
    setMistakes(nextMistakes);
    moveToNextOrder(completed, nextMistakes, `${current.customer}'s time ran out — the next order is ready!`);
  }, [timeLeft, serving, orderIndex, mistakes, completed, current]);

  function placeIngredient(ingredient: BurgerIngredient, offset: number) {
    if (serving) return;
    const expected = current.ingredients[built.length];
    if (ingredient !== expected) {
      setMistakes((value) => value + 1);
      setFeedback(`Not yet—customer ${current.customer} needs ${burgerIngredient(expected).label} next.`);
      return;
    }

    const nextBuilt = [...built, { ingredient, offset }];
    const previous = built[built.length - 1];
    const offsets = nextBuilt.map((item) => item.offset);
    const unstable = Boolean(previous && Math.abs(previous.offset - offset) > 72)
      || Math.max(...offsets) - Math.min(...offsets) > 130;
    setSelectedIngredient(null);
    setBuilt(nextBuilt);
    if (unstable) {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      setServing(true);
      setTipped(true);
      setFeedback("The burger tipped over! Keep each layer closer to the center.");
      window.setTimeout(() => {
        setBuilt([]);
        setTipped(false);
        setServing(false);
        setFeedback("Rebuild it before the timer runs out!");
      }, 900);
      return;
    }
    setFeedback(nextBuilt.length === current.ingredients.length ? "Perfect stack! Adding the finishing sparkle…" : "Great—keep stacking!");
    if (nextBuilt.length !== current.ingredients.length) return;

    setServing(true);
    setCelebrating(true);
    const nextCompleted = completed + 1;
    setCompleted(nextCompleted);
    window.setTimeout(() => setCelebrating(false), 1150);
    window.setTimeout(() => moveToNextOrder(nextCompleted, mistakes), 1750);
  }

  function dropIngredient(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const ingredient = event.dataTransfer.getData("text/plain") as BurgerIngredient;
    if (!BURGER_INGREDIENTS.some((item) => item.key === ingredient)) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = Math.max(-90, Math.min(90, event.clientX - bounds.left - bounds.width / 2));
    placeIngredient(ingredient, Math.round(offset));
  }

  function placeSelected(event: ReactMouseEvent<HTMLDivElement>) {
    if (!selectedIngredient || serving) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = Math.max(-90, Math.min(90, event.clientX - bounds.left - bounds.width / 2));
    placeIngredient(selectedIngredient, Math.round(offset));
  }

  return (
    <section className="mx-auto max-w-5xl rounded-3xl bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-black text-slate-800"><ChefHat className="text-amber-700" /> Burger Rush</h2>
          <p className="text-sm font-bold text-slate-500">Customer {orderIndex + 1}/{orders.length} · {completed} served · {mistakes} mistakes</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>

      <div className="mb-3 overflow-hidden rounded-3xl border-2 border-slate-200 bg-slate-100 p-2 sm:mb-5 sm:p-3">
        <div className="flex min-w-max items-stretch gap-3">
          {orders.slice(orderIndex, orderIndex + 3).map((order, queueIndex) => (
            <div key={order.id} className={`w-64 rounded-2xl border-2 p-3 transition-all ${queueIndex > 0 ? "hidden sm:block" : ""} ${queueIndex === 0 ? "border-amber-400 bg-white shadow-md" : "border-slate-200 bg-slate-50 opacity-70"}`}>
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase text-slate-400">{queueIndex === 0 ? "Now serving" : `Up next ${queueIndex}`}</span>{order.special && <span className="text-xs">⭐</span>}</div>
              <p className="mt-1 font-black text-slate-800">{order.customer} · {order.name}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-300"><div className="h-full rounded-full bg-amber-500 transition-all duration-1000" style={{ width: `${Math.max(0, (timeLeft / burgerOrderSeconds(current)) * 100)}%` }} /></div>
        <p className={`mt-1 text-right text-xs font-black ${timeLeft <= 7 ? "text-red-600" : "text-slate-500"}`}>{timeLeft}s left on this order</p>
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-5">
        <div className="contents lg:block lg:space-y-4">
          <div className="order-1 rounded-3xl bg-amber-50 p-3 sm:p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><p className="text-xs font-black uppercase tracking-widest text-amber-700">Order ticket · {current.customer}</p><h3 className="mt-1 text-xl font-black text-slate-800">{current.name}</h3></div>
              {current.special && <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-black text-red-700">Special order</span>}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {current.ingredients.map((ingredient, index) => {
                const item = burgerIngredient(ingredient);
                return <span key={`${ingredient}-${index}`} className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-black ${index < built.length ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-white text-slate-600"}`}><BurgerIngredientArt ingredient={ingredient} className="h-7 w-7" />{item.label}</span>;
              })}
            </div>
          </div>

          <div
            role="application"
            aria-label="Burger stacking canvas"
            onDragOver={(event) => event.preventDefault()}
            onDrop={dropIngredient}
            onClick={placeSelected}
            className={`order-4 relative min-h-60 cursor-crosshair overflow-hidden rounded-3xl border-4 border-dashed p-3 text-center transition-colors sm:min-h-[28rem] sm:p-5 lg:min-h-[28rem] ${selectedIngredient ? "border-amber-400 bg-amber-50" : "border-slate-600 bg-slate-900"}`}
          >
            <p className={`text-xs font-black uppercase tracking-widest ${selectedIngredient ? "text-amber-700" : "text-slate-400"}`}>Burger stacking canvas</p>
            <p className={`mt-1 text-xs font-bold ${selectedIngredient ? "text-amber-700" : "text-slate-500"}`}>{selectedIngredient ? `Tap where you want to place ${burgerIngredient(selectedIngredient).label}` : "Drag ingredients here and keep the stack balanced"}</p>
            <div className="pointer-events-none absolute inset-x-0 bottom-12 h-52 sm:bottom-16 sm:h-80">
              <div className="absolute bottom-3 left-1/2 h-12 w-64 -translate-x-1/2 rounded-[50%] border-4 border-slate-300 bg-white shadow-xl" />
              {built.map((placed, index) => {
                const item = burgerIngredient(placed.ingredient);
                return <span
                  key={`${placed.ingredient}-${index}`}
                  className={`absolute bottom-0 left-1/2 -ml-20 flex h-28 w-40 items-center justify-center transition-all duration-500 sm:-ml-28 sm:h-40 sm:w-56 ${celebrating ? "brightness-125 drop-shadow-[0_0_18px_rgba(250,204,21,0.95)]" : "drop-shadow-xl"} ${placed.ingredient === "top-bun" && celebrating ? "animate-bounce" : ""} ${sendingBurger ? "opacity-0" : ""}`}
                  style={{ bottom: `${index * 18 + 5}px`, transform: tipped ? "translateX(155px) rotate(24deg)" : sendingBurger ? "translateX(360px)" : `translateX(${placed.offset}px)`, zIndex: index + 2 }}
                  title={item.label}
                ><BurgerIngredientArt ingredient={placed.ingredient} className="h-28 w-28 sm:h-40 sm:w-40" /></span>;
              })}
              {celebrating && <div className="absolute inset-0 z-30 flex items-center justify-center"><div className="absolute h-52 w-52 animate-ping rounded-full border-8 border-yellow-300/70" /><div className="animate-bounce rounded-3xl bg-yellow-300 px-6 py-3 text-3xl font-black text-amber-900 shadow-[0_0_35px_rgba(250,204,21,0.95)]">+1 ORDER! ✨</div></div>}
            </div>
            <div className="absolute inset-x-0 bottom-0 h-12 overflow-hidden border-t-4 border-slate-500 bg-slate-700 sm:h-16">
              <div className="flex h-full items-center justify-around text-2xl text-slate-400"><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span><span>●</span></div>
            </div>
          </div>
          <div className="order-5 mt-0 flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 lg:mt-2"><span className="text-xs font-black text-slate-600">Stack stability</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-300"><div className={`h-full rounded-full transition-all ${stability > 55 ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${stability}%` }} /></div><span className="w-9 text-right text-xs font-black text-slate-600">{stability}%</span></div>
        </div>

        <div className="contents lg:block">
          <p className={`order-2 mb-0 rounded-2xl px-4 py-2 text-sm font-black lg:mb-3 lg:py-3 ${feedback.includes("Not yet") || feedback.includes("tipped") || feedback.includes("timed out") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>{feedback}</p>
          <div className="order-3">
          <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Ingredient station · drag to canvas</p>
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-3 sm:gap-2">
            {BURGER_INGREDIENTS.map((ingredient) => (
              <button
                key={ingredient.key}
                type="button"
                draggable={!serving}
                onDragStart={(event) => { event.dataTransfer.setData("text/plain", ingredient.key); event.dataTransfer.effectAllowed = "move"; }}
                onClick={(event) => { event.stopPropagation(); setSelectedIngredient((currentValue) => currentValue === ingredient.key ? null : ingredient.key); }}
                disabled={serving}
                className={`group min-h-16 cursor-grab rounded-xl border-2 p-1 text-center transition-all active:cursor-grabbing disabled:opacity-50 sm:min-h-24 sm:rounded-2xl sm:p-2 ${selectedIngredient === ingredient.key ? "border-amber-500 bg-amber-100 ring-2 ring-amber-200" : "border-amber-100 bg-amber-50 hover:-translate-y-0.5 hover:border-amber-300"}`}
              >
                <BurgerIngredientArt ingredient={ingredient.key} className="mx-auto h-10 w-10 transition-transform group-hover:scale-105 sm:h-16 sm:w-16" /><span className="mt-0.5 hidden text-[10px] font-black text-slate-700 sm:mt-1 sm:block sm:text-xs">{ingredient.label}</span>
              </button>
            ))}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type JungleItem = { id: number; kind: "banana" | "golden" | "coconut"; x: number; y: number };

function JungleVineSwing({
  onExit,
  onFinish,
}: {
  onExit: () => void;
  onFinish: (score: number, durationSeconds: number, metadata: Record<string, unknown>) => void;
}) {
  const [status, setStatus] = useState<"ready" | "playing" | "over">("ready");
  const [items, setItems] = useState<JungleItem[]>([]);
  const [score, setScore] = useState(0);
  const [bananas, setBananas] = useState(0);
  const [combo, setCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(45);
  const [swingPhase, setSwingPhase] = useState(0);
  const [holding, setHolding] = useState(false);
  const itemId = useRef(0);
  const swingPhaseRef = useRef(0);
  const holdingRef = useRef(false);
  const scoreRef = useRef(0);
  const bananasRef = useRef(0);
  const comboRef = useRef(0);
  const hitsRef = useRef(0);

  const swingSize = holding ? 18 : 11;
  const monkeyX = 50 + Math.sin(swingPhase) * swingSize;
  const monkeyY = 52 + Math.cos(swingPhase) * swingSize;

  function setHold(value: boolean) {
    holdingRef.current = value;
    setHolding(value);
  }

  function startRun() {
    scoreRef.current = 0;
    bananasRef.current = 0;
    comboRef.current = 0;
    hitsRef.current = 0;
    swingPhaseRef.current = 0;
    setScore(0);
    setBananas(0);
    setCombo(0);
    setHits(0);
    setTimeLeft(45);
    setSwingPhase(0);
    setItems([]);
    setHold(false);
    setStatus("playing");
  }

  useEffect(() => {
    if (status !== "playing") return;
    const ticker = window.setInterval(() => {
      const phase = (swingPhaseRef.current + (holdingRef.current ? 0.31 : 0.2)) % (Math.PI * 2);
      swingPhaseRef.current = phase;
      setSwingPhase(phase);
      const amplitude = holdingRef.current ? 18 : 11;
      const monkeyX = 50 + Math.sin(phase) * amplitude;
      const monkeyY = 52 + Math.cos(phase) * amplitude;

      setItems((current) => {
        const speed = 4.2 + Math.min(3.6, scoreRef.current / 140);
        const remaining: JungleItem[] = [];
        for (const item of current) {
          const next = { ...item, x: item.x - speed };
          if (Math.abs(next.x - monkeyX) < 7 && Math.abs(next.y - monkeyY) < 10) {
            if (next.kind === "coconut") {
              hitsRef.current += 1;
              comboRef.current = 0;
              setHits(hitsRef.current);
              setCombo(0);
              if (hitsRef.current >= 3) setStatus("over");
            } else {
              const nextCombo = comboRef.current + 1;
              const points = next.kind === "golden" ? 50 : 10 + Math.min(50, nextCombo * 5);
              comboRef.current = nextCombo;
              bananasRef.current += 1;
              scoreRef.current += points;
              setCombo(nextCombo);
              setBananas(bananasRef.current);
              setScore(scoreRef.current);
            }
          } else if (next.x > -10) {
            remaining.push(next);
          }
        }
        if (Math.random() < 0.32 && remaining.length < 7) {
          const roll = Math.random();
          remaining.push({
            id: itemId.current++,
            kind: roll < 0.68 ? "banana" : roll < 0.78 ? "golden" : "coconut",
            x: 108,
            y: 25 + Math.random() * 50,
          });
        }
        return remaining;
      });
    }, 100);
    const clock = window.setInterval(() => {
      setTimeLeft((seconds) => {
        if (seconds <= 1) {
          setStatus("over");
          return 0;
        }
        return seconds - 1;
      });
    }, 1000);
    return () => {
      window.clearInterval(ticker);
      window.clearInterval(clock);
    };
  }, [status]);

  const finishRun = () => {
    const duration = Math.max(1, 45 - timeLeft);
    onFinish(score, duration, { bananas, coconutHits: hits, bestCombo: combo, remainingSeconds: timeLeft });
  };

  return (
    <section className="mx-auto max-w-5xl rounded-3xl bg-white p-3 shadow-sm sm:p-6">
      <div className="mb-3 flex items-center justify-between gap-3 sm:mb-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-emerald-950 sm:text-2xl"><TreePine className="text-emerald-600" /> Jungle Vine Swing</h2>
          <p className="text-xs font-bold text-emerald-800 sm:text-sm">Hold to swing wider · release to glide through the fruit</p>
        </div>
        <button type="button" onClick={onExit} className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-black text-slate-600">Exit</button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 sm:mb-4 sm:gap-3">
        <div className="rounded-2xl bg-yellow-100 px-3 py-2 text-center"><p className="text-[10px] font-black uppercase text-yellow-700">Score</p><p className="text-lg font-black text-yellow-950">🍌 {score}</p></div>
        <div className="rounded-2xl bg-emerald-100 px-3 py-2 text-center"><p className="text-[10px] font-black uppercase text-emerald-700">Combo</p><p className="text-lg font-black text-emerald-950">×{combo}</p></div>
        <div className="rounded-2xl bg-orange-100 px-3 py-2 text-center"><p className="text-[10px] font-black uppercase text-orange-700">Coconuts</p><p className="text-lg font-black text-orange-950">{"🥥".repeat(Math.max(0, 3 - hits))}</p></div>
      </div>

      <div
        role="application"
        aria-label="Jungle Vine Swing game area"
        onPointerDown={() => status === "playing" && setHold(true)}
        onPointerUp={() => setHold(false)}
        onPointerCancel={() => setHold(false)}
        onPointerLeave={() => setHold(false)}
        className="relative h-[28rem] touch-none select-none overflow-hidden rounded-3xl border-4 border-emerald-900 bg-[linear-gradient(#8ce7ef_0%,#b9f3c3_48%,#3f9c54_49%,#176b3b_100%)] sm:h-[32rem]"
      >
        <div className="absolute inset-x-0 top-0 flex justify-between px-6 text-6xl opacity-40"><span>🌿</span><span>🌿</span></div>
        <div className="absolute left-[8%] top-[18%] h-64 w-16 rounded-full bg-emerald-900/35" />
        <div className="absolute right-[10%] top-[12%] h-72 w-20 rounded-full bg-emerald-900/35" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-[radial-gradient(ellipse_at_center,_#65c958_0%,_#2c843d_55%,_#176b3b_100%)]" />

        <div className="absolute left-1/2 top-0 h-[56%] w-1 origin-top bg-amber-950/80" style={{ transform: `translateX(-50%) rotate(${Math.sin(swingPhase) * swingSize * 1.45}deg)` }} />
        <div className="absolute z-20 -translate-x-1/2 -translate-y-1/2 text-6xl drop-shadow-lg transition-[left,top] duration-100" style={{ left: `${monkeyX}%`, top: `${monkeyY}%` }} aria-label="Swinging monkey">🐒</div>

        {items.map((item) => (
          <div key={item.id} className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 text-4xl ${item.kind === "coconut" ? "animate-bounce" : ""}`} style={{ left: `${item.x}%`, top: `${item.y}%` }}>
            {item.kind === "banana" ? "🍌" : item.kind === "golden" ? "🌟🍌" : "🥥"}
          </div>
        ))}

        <div className="absolute inset-x-0 bottom-3 z-30 flex items-center justify-between px-4 text-xs font-black text-white drop-shadow"><span>{timeLeft}s left</span><span>{bananas} bananas collected</span></div>

        {status === "ready" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-emerald-950/35 p-5 text-center">
            <div className="max-w-sm rounded-3xl bg-white p-5 shadow-xl">
              <p className="text-4xl">🐒🍌🥥</p><h3 className="mt-2 text-2xl font-black text-emerald-950">Ready to swing?</h3>
              <p className="mt-2 text-sm font-bold text-slate-600">Bananas score 10+ combo points. Golden bananas score 50. Avoid three coconuts!</p>
              <button type="button" onClick={startRun} className="mt-4 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-black text-white shadow-lg">Start jungle run</button>
            </div>
          </div>
        )}
        {status === "over" && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-emerald-950/45 p-5 text-center">
            <div className="max-w-sm rounded-3xl bg-white p-5 shadow-xl"><p className="text-4xl">🏆</p><h3 className="mt-2 text-2xl font-black text-emerald-950">Jungle run complete!</h3><p className="mt-2 font-bold text-slate-600">{score} points · {bananas} bananas · {hits} coconut hits</p><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={startRun} className="rounded-2xl bg-emerald-100 px-4 py-3 font-black text-emerald-800">Play again</button><button type="button" onClick={finishRun} className="rounded-2xl bg-emerald-600 px-4 py-3 font-black text-white">Save run</button></div></div>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={status !== "playing"}
        onPointerDown={() => setHold(true)}
        onPointerUp={() => setHold(false)}
        onPointerLeave={() => setHold(false)}
        className={`mt-3 w-full rounded-2xl px-5 py-4 text-base font-black shadow-sm transition-all sm:hidden ${holding ? "scale-[0.98] bg-yellow-400 text-yellow-950" : "bg-emerald-600 text-white"} disabled:opacity-50`}
      >
        {holding ? "Swinging! Release to glide" : "Press and hold to swing"}
      </button>
    </section>
  );
}
