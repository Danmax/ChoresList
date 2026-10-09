"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, BookOpen, Check, Heart, Loader2, Moon, PawPrint, RefreshCw, ShoppingBag, Sparkles, Star, Sun, X } from "lucide-react";
import { CARE_TASKS, PET_SHOP, PET_SPECIES, PLAY_SYMBOLS, petLevel, petMood, type PetAction, type PetSpecies, type PetState } from "@/lib/pocket-pals";
import styles from "./pocket-pals.module.css";

type Challenge = { id: string; kind: "play" | "bubble" | "hide" | "balance" | "learn"; startedAt: number; sequence?: number[]; bubbles?: string[]; spots?: string[]; items?: string[]; topic?: string; question?: string; choices?: string[] };
type RosterPal = { id: string; name: string; species: PetSpecies; serialNumber: string; primaryGuardianId: string };
type PetResponse = { pet: PetState | null; palId: string | null; version: number | null; serverNow: number; roster: RosterPal[]; challenge: Challenge | null; message?: string; completed?: boolean; reward?: { points: number; tickets: number } | null };
const TASK_LABELS = { feed: "Dumpling", clean: "Bath", play: "Play", learn: "Learn", sleep: "Rest" };
const TASK_EMOJIS = { feed: "🥟", clean: "🫧", play: "🧸", learn: "📖", sleep: "🌙" };
const STAT_META = [
  { key: "hunger", label: "Full tummy", emoji: "🥟", color: "#efa269" },
  { key: "happiness", label: "Happiness", emoji: "💗", color: "#ec90ae" },
  { key: "cleanliness", label: "Fresh & fluffy", emoji: "🫧", color: "#80bfca" },
  { key: "energy", label: "Energy", emoji: "🌙", color: "#a899d6" },
  { key: "smarts", label: "Smarts", emoji: "📖", color: "#90ba85" },
  { key: "bond", label: "Our bond", emoji: "💕", color: "#da8b9f" },
] as const;
const ROOM_NAMES: Record<string, string> = { home: "Our cozy home", garden: "Garden nook", library: "Storybook room", stargazer: "Stargazer room", sunroom: "Sunny sunroom" };
const ROOM_CLASSES: Record<string, string | undefined> = { garden: styles.garden, library: styles.library, stargazer: styles.stargazer, sunroom: styles.sunroom };
const DECOR_CLASSES: Record<string, string | undefined> = {
  "flower-wall": styles.flowerWall, "potted-palm": styles.pottedPalm, "cozy-sofa": styles.cozySofa,
  "reading-lamp": styles.readingLamp, "tea-table": styles.teaTable, "wall-shelves": styles.wallShelves,
};

function PetArt({ species, name, className = "" }: { species: PetSpecies; name: string; className?: string }) {
  return <img src={`/games/pocket-pals/${species}.webp`} alt={`${name}, your anime ${PET_SPECIES.find((s) => s.id === species)?.label.toLowerCase()}`} className={className} draggable={false} />;
}

export function PocketPals({ memberId, playerName, onExit }: { memberId: string; playerName: string; onExit: () => void }) {
  const [data, setData] = useState<PetResponse | null>(null);
  const [selectedPalId, setSelectedPalId] = useState("");
  const [adopting, setAdopting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("A little love makes a big difference.");
  const [species, setSpecies] = useState<PetSpecies>("dog");
  const [name, setName] = useState("Mochi");
  const [showShop, setShowShop] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [activity, setActivity] = useState("");
  const [clock, setClock] = useState(Date.now());
  const [selectedTreats, setSelectedTreats] = useState<number[]>([]);
  const [showPlayGames, setShowPlayGames] = useState(false);
  const [caughtBubbles, setCaughtBubbles] = useState<string[]>([]);
  const [balancePlacements, setBalancePlacements] = useState<number[]>([]);
  const [watchUntil, setWatchUntil] = useState(0);
  const [badge, setBadge] = useState(false);
  const requestInFlight = useRef(false);
  const alive = useRef(true);
  const serverOffset = useRef(0);
  const shopDialog = useRef<HTMLDialogElement>(null);

  const load = useCallback(async () => {
    try {
      const palQuery = selectedPalId ? `&palId=${encodeURIComponent(selectedPalId)}` : "";
      const res = await fetch(`/api/pocket-pals?memberId=${encodeURIComponent(memberId)}${palQuery}`, { cache: "no-store" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Your pal couldn't load. Try again.");
      if (alive.current) { serverOffset.current = result.serverNow - Date.now(); setData(result); if (result.palId && result.palId !== selectedPalId) setSelectedPalId(result.palId); setError(""); }
    } catch (e) { if (alive.current) setError(e instanceof Error ? e.message : "Couldn't reach your pal."); }
    finally { if (alive.current) setLoading(false); }
  }, [memberId, selectedPalId]);

  useEffect(() => { alive.current = true; void load(); return () => { alive.current = false; }; }, [load]);
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 500); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!activity) return;
    const timer = window.setTimeout(() => setActivity(""), 2200);
    return () => window.clearTimeout(timer);
  }, [activity]);
  useEffect(() => {
    if (showShop && shopDialog.current && !shopDialog.current.open) shopDialog.current.showModal();
  }, [showShop]);

  const act = useCallback(async (action: PetAction | "adopt", extra: Record<string, unknown> = {}) => {
    if (requestInFlight.current) return false;
    requestInFlight.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/api/pocket-pals", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, palId: data?.palId, version: data?.version, action, ...extra }) });
      const result = await res.json();
      if (!res.ok) {
        if (res.status === 409) await load();
        throw new Error(result.error ?? "Couldn't save that activity. Try again.");
      }
      if (!alive.current) return false;
      serverOffset.current = result.serverNow - Date.now();
      setData(result); if (result.palId) setSelectedPalId(result.palId); if (action === "adopt") setAdopting(false); setMessage(result.message || "Looking lovely!"); setActivity(action);
      if (["start-play", "start-bubble", "start-hide", "start-balance"].includes(action)) setShowPlayGames(false);
      if (result.challenge?.kind === "play") { setWatchUntil(Date.now() + 4000); setSelectedTreats([]); }
      if (result.challenge?.kind === "bubble") setCaughtBubbles([]);
      if (result.challenge?.kind === "balance") setBalancePlacements([]);
      if (result.completed) {
        setBadge(true);
        setMessage(`Daily care complete! +${30 + Math.min(5, result.pet.streak - 1) * 2} coins${result.reward?.points ? ` and ${result.reward.points} family points` : result.reward?.tickets ? ` and ${result.reward.tickets} tickets` : ""}.`);
      }
      return true;
    } catch (e) {
      if (alive.current) setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      return false;
    } finally { requestInFlight.current = false; if (alive.current) setBusy(false); }
  }, [memberId, data?.palId, data?.version, load]);

  const pet = data?.pet;
  // Use the server clock offset so a device with an incorrect clock cannot
  // wake a pet early or leave it sleeping indefinitely.
  const serverClock = clock + serverOffset.current;
  const sleepRemaining = pet?.sleepingUntil ? Math.max(0, Math.ceil((pet.sleepingUntil - serverClock) / 1000)) : 0;
  useEffect(() => {
    if (pet?.sleepingUntil && sleepRemaining === 0 && !busy && !error) void act("wake");
  }, [pet?.sleepingUntil, sleepRemaining, busy, error, act]);

  async function adopt(event: FormEvent) { event.preventDefault(); await act("adopt", { species, name }); }

  const selectedSpecies = PET_SPECIES.find((petSpecies) => petSpecies.id === species)!;

  if (loading) return <section className={styles.game}><div className={styles.loading}><Loader2 className="animate-spin" /> Finding your little friend…</div></section>;
  if (!data && error) return <section className={styles.game}><div className={styles.loading}><p role="alert">{error}</p><button className={styles.primary} onClick={() => void load()}>Try again</button><button onClick={onExit}>Back to games</button></div></section>;

  if (!pet || adopting) return (
    <section className={styles.game}>
      <div className={styles.header}><button onClick={adopting ? () => setAdopting(false) : onExit} className={styles.back}><ArrowLeft size={18} /> {adopting ? "Back to roster" : "Games"}</button><span className={styles.eyebrow}><PawPrint size={15} /> A tiny friend. A big adventure.</span></div>
      <div className={styles.adoption}>
        <span className={styles.pill}><Sparkles size={14} /> Your friendship starts here</span>
        <h2>Meet your <em>Pocket Pal.</em></h2>
        <p>A warm dumpling, a little play, and a whole lot of love. Who will be {playerName}&apos;s new best friend?</p>
        <div className={styles.speciesGrid}>
          {PET_SPECIES.map((s) => <button key={s.id} type="button" aria-label={`Adopt a ${s.label.toLowerCase()}`} aria-pressed={species === s.id} className={`${styles.speciesCard} ${species === s.id ? styles.selected : ""}`} onClick={() => { setSpecies(s.id); setName(s.name); }}>
            <span className={styles.selectionCheck}>{species === s.id && <Check size={16} />}</span>
            <PetArt species={s.id} name={s.name} /><strong>{s.label}</strong><span>{s.personality}</span>
          </button>)}
        </div>
        <form onSubmit={adopt} className={styles.adoptForm}>
          <label htmlFor="pal-name">Give your pal a name</label>
          <div><input id="pal-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required placeholder="Your pal's name" /><button className={styles.primary} disabled={busy || !name.trim()}>{busy ? "Making a cozy home…" : "Bring my pal home"}<Heart size={17} /></button></div>
          <fieldset className={styles.nameSuggestions}>
            <legend>Sweet {selectedSpecies.label.toLowerCase()} name ideas</legend>
            <div>{selectedSpecies.names.map((suggestion) => <button key={suggestion} type="button" aria-pressed={name === suggestion} onClick={() => setName(suggestion)}>{suggestion}</button>)}</div>
          </fieldset>
        </form>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <p className={styles.smallNote}>Your pet saves automatically. Four fresh dumplings arrive each new day.</p>
      </div>
    </section>
  );

  const mood = petMood(pet);
  const level = petLevel(pet);
  const challenge = data?.challenge;
  const sleeping = Boolean(pet.sleepingUntil);
  const ready = !busy && !sleeping && serverClock - pet.lastActionAt >= 2000;
  const watching = clock < watchUntil;
  const accessory = PET_SHOP.find((i) => i.id === pet.accessory);
  const accessoryClass = ({
    bow: styles.bow,
    "sunny-cap": styles.sunnyCap,
    "bookish-glasses": styles.bookishGlasses,
    crown: styles.crown,
    "cozy-scarf": styles.cozyScarf,
    "tiny-backpack": styles.tinyBackpack,
    sparkles: styles.sparkles,
    "rainbow-cape": styles.rainbowCape,
  } as Record<string, string | undefined>)[pet.accessory ?? ""] ?? "";
  const roomName = ROOM_NAMES[pet.room] ?? ROOM_NAMES.home;
  const decorations = PET_SHOP.filter((item) => item.kind === "decor" && pet.owned.includes(item.id));
  const rooms = PET_SHOP.filter((item) => item.kind === "room");

  return (
    <section className={styles.game} aria-busy={busy}>
      <div className={styles.header}>
        <button onClick={onExit} className={styles.back}><ArrowLeft size={18} /> Games</button>
        <span className={styles.brand}><PawPrint size={19} /> Pocket Pals</span>
        <div className={styles.wallet}><span aria-label={`${pet.dumplings} dumplings`}>🥟 {pet.dumplings}</span><span aria-label={`${pet.coins} coins`}>🪙 {pet.coins}</span><button onClick={() => setShowShop(true)} aria-label="Open pet shop"><ShoppingBag size={18} /></button></div>
      </div>
      {data?.roster && <div className={styles.roster} aria-label="Your Pocket Pal roster">{data.roster.map((rosterPal) => <button key={rosterPal.id} type="button" aria-pressed={rosterPal.id === data.palId} onClick={() => { setSelectedPalId(rosterPal.id); setShowShop(false); setRenaming(false); }}><PetArt species={rosterPal.species} name={rosterPal.name} /><span><strong>{rosterPal.name}</strong><small>{rosterPal.serialNumber}</small></span></button>)}{data.roster.length < 3 && <button type="button" className={styles.addPal} onClick={() => setAdopting(true)}><span>＋</span><strong>Adopt another</strong><small>Up to 3 pals</small></button>}</div>}
      <div className={styles.layout}>
        <div className={styles.main}>
          <div className={styles.petHeading}>
            <div><span className={styles.eyebrow}>{playerName}&apos;s little companion · {pet.serialNumber}</span><h2>{pet.name}<button onClick={() => { setName(pet.name); setRenaming(!renaming); }} aria-label="Rename your pet">✎</button></h2>{pet.appearance && <p className={styles.passport}>{pet.appearance.baseColor} · {pet.appearance.pattern} · {pet.appearance.texture} · {pet.appearance.eyeColor} eyes</p>}</div>
            <span className={styles.level}><Star size={15} /> Level {level}</span>
          </div>
          {renaming && <form className={styles.rename} onSubmit={async (e) => { e.preventDefault(); if (await act("rename", { name })) setRenaming(false); }}><input aria-label="New pet name" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} required /><button disabled={busy || !name.trim()}>Save</button><button type="button" onClick={() => setRenaming(false)}>Cancel</button></form>}
          <div className={`${styles.room} ${ROOM_CLASSES[pet.room] ?? ""} ${sleeping ? styles.night : ""}`}>
            <div className={styles.roomLabel}>{sleeping ? <Moon size={14} /> : <Sun size={14} />}{roomName}</div>
            <div className={styles.window}><span>{sleeping ? "🌙" : "☀️"}</span><i /><i /></div>
            <span className={styles.decorLeft}>{pet.room === "garden" ? "🌷" : pet.room === "library" ? "📚" : "🪴"}</span>
            <span className={styles.decorRight}>{pet.room === "garden" ? "🌻" : pet.room === "library" ? "📖" : "🧸"}</span>
            {decorations.map((item) => <span key={item.id} className={`${styles.roomDecoration} ${DECOR_CLASSES[item.id] ?? ""}`} aria-label={item.name}>{item.emoji}</span>)}
            <div className={styles.rug} />
            <div className={`${styles.petFigure} ${sleeping ? styles.sleeping : ""} ${activity === "feed" ? styles.munching : activity === "clean" ? styles.wiggling : ["affection", "finish-play", "answer"].includes(activity) ? styles.bouncing : ""}`}>
              {accessory && <span className={`${styles.accessory} ${accessoryClass}`}>{accessory.emoji}</span>}
              <button disabled={!ready} onClick={() => void act("affection")} aria-label={`Cuddle ${pet.name}`} className={styles.petButton}><PetArt species={pet.species} name={pet.name} /></button>
              {sleeping && <span className={styles.sleepMarks}>z z Z</span>}
              {activity === "feed" && <span className={styles.treat}>🥟</span>}
              {activity === "clean" && <div className={styles.bubbles}><span>🫧</span><span>🫧</span><span>🫧</span></div>}
              {["affection", "finish-play", "answer"].includes(activity) && <span className={styles.love}>💕</span>}
            </div>
            <div className={styles.mood}>{mood.emoji} {mood.label}</div>
            {pet.cleanliness < 40 && !sleeping && <span className={styles.dust}>🍂</span>}
          </div>
          <div className={styles.speech} role="status" aria-live="polite"><Heart size={17} /><p>{sleeping ? `Shhh… ${sleepRemaining}s of cozy dreaming left.` : message}</p>{busy && <Loader2 size={15} className="animate-spin" />}</div>
          {error && <p className={styles.error} role="alert">{error} <button onClick={() => void load()} aria-label="Refresh pet"><RefreshCw size={14} /></button></p>}
          <div className={styles.actions}>
            <button disabled={!ready || pet.dumplings === 0} onClick={() => void act("feed")}><span>🥟</span><strong>Feed</strong><small>Dumpling time</small></button>
            <button disabled={!ready} onClick={() => void act("clean")}><span>🫧</span><strong>Clean</strong><small>Fresh & fluffy</small></button>
            <button disabled={!ready} onClick={() => setShowPlayGames((open) => !open)}><span>🧸</span><strong>Play</strong><small>Choose a game</small></button>
            <button disabled={busy || (!sleeping && !ready)} onClick={() => void act(sleeping ? "wake" : "sleep")}><span>{sleeping ? "☀️" : "🌙"}</span><strong>{sleeping ? "Wake" : "Sleep"}</strong><small>{sleeping ? `${sleepRemaining}s left` : "A cozy nap"}</small></button>
            <button disabled={!ready} onClick={() => void act("start-learn")}><span>📖</span><strong>Learn</strong><small>Grow together</small></button>
          </div>
          {showPlayGames && !challenge && <div className={styles.gamePicker}><div><span className={styles.eyebrow}>Play together</span><h3>What should {pet.name} play?</h3></div><div>{[{ action: "start-play", emoji: "🧸", title: "Treat memory", detail: "Remember the treat pattern" }, { action: "start-bubble", emoji: "🫧", title: "Bubble Catch", detail: "Pop every floating bubble" }, { action: "start-hide", emoji: "🙈", title: "Hide-and-Seek", detail: "Find your hidden pal" }, { action: "start-balance", emoji: "🧱", title: "Balance Builder", detail: "Build a steady tower" }].map((game) => <button key={game.action} disabled={!ready} onClick={() => void act(game.action as PetAction)}><span>{game.emoji}</span><strong>{game.title}</strong><small>{game.detail}</small></button>)}</div><small>Each win earns 8 coins, for your first three wins each day.</small></div>}
          {challenge && <div className={styles.activityPanel}>
            <div className={styles.panelHeading}><h3>{challenge.kind === "play" ? "Treat memory" : challenge.kind === "bubble" ? "Bubble Catch" : challenge.kind === "hide" ? "Hide-and-Seek" : challenge.kind === "balance" ? "Balance Builder" : `${challenge.topic} together`}</h3><span>{challenge.kind === "play" ? "🧸" : challenge.kind === "bubble" ? "🫧" : challenge.kind === "hide" ? "🙈" : challenge.kind === "balance" ? "🧱" : "📖"}</span></div>
            {challenge.kind === "play" ? <>
              <p>{watching ? "Look closely! Remember these treats in order." : "Your turn! Tap the treats in the same order."}</p>
              <div className={styles.pattern} aria-label={watching ? "Treat sequence to remember" : "Your selected treats"}>{(watching ? challenge.sequence ?? [] : (challenge.sequence ?? []).map((_, i) => selectedTreats[i] ?? -1)).map((s, i) => <span key={i}>{s < 0 ? "?" : PLAY_SYMBOLS[s]}</span>)}</div>
              {!watching && <><div className={styles.treatChoices}>{PLAY_SYMBOLS.map((symbol, i) => <button key={i} disabled={!ready || selectedTreats.length >= (challenge.sequence?.length ?? 0)} onClick={() => setSelectedTreats((prev) => [...prev, i])} aria-label={`Choose ${symbol}`}>{symbol}</button>)}</div><div className={styles.playButtons}><button onClick={() => { setSelectedTreats([]); setWatchUntil(clock + 4000); }} disabled={busy}>Show me again</button><button className={styles.primary} disabled={!ready || selectedTreats.length !== challenge.sequence?.length} onClick={() => void act("finish-play", { challengeId: challenge.id, sequence: selectedTreats })}>Check pattern</button></div></>}
              <small>Earn 8 coins per win for your first three wins each day.</small>
            </> : challenge.kind === "bubble" ? <><p>Tap every bubble, then celebrate your catch with {pet.name}.</p><div className={styles.bubbleField}>{challenge.bubbles?.map((bubble, index) => <button key={bubble} className={caughtBubbles.includes(bubble) ? styles.caughtBubble : ""} disabled={!ready || caughtBubbles.includes(bubble)} onClick={() => setCaughtBubbles((caught) => [...caught, bubble])} style={{ left: `${10 + (index * 31) % 76}%`, top: `${12 + (index * 37) % 64}%` }} aria-label={`Catch bubble ${index + 1}`}>🫧</button>)}</div><div className={styles.playButtons}><span>{caughtBubbles.length}/{challenge.bubbles?.length ?? 0} caught</span><button className={styles.primary} disabled={!ready || caughtBubbles.length !== challenge.bubbles?.length} onClick={() => void act("finish-bubble", { challengeId: challenge.id, caught: caughtBubbles })}>Finish catch</button></div><small>Earn 8 coins per win for your first three wins each day.</small></> : challenge.kind === "hide" ? <><p>Where did {pet.name} hide?</p><div className={styles.answers}>{challenge.spots?.map((spot, index) => <button key={spot} disabled={!ready} onClick={() => void act("guess-hide", { challengeId: challenge.id, choice: index })}>{spot}</button>)}</div><small>Earn 8 coins per win for your first three wins each day.</small></> : challenge.kind === "balance" ? <><p>Place each item left, center, or right to keep the tower steady.</p><div className={styles.balanceStack}>{challenge.items?.map((item, index) => <span key={`${item}-${index}`} className={balancePlacements[index] === undefined ? styles.unplaced : ""} style={balancePlacements[index] === undefined ? undefined : { transform: `translateX(${balancePlacements[index] * 28}px)` }}>{item}</span>)}</div><div className={styles.balanceControls}>{["Left", "Center", "Right"].map((label, index) => <button key={label} disabled={!ready || balancePlacements.length === challenge.items?.length} onClick={() => setBalancePlacements((placements) => [...placements, index - 1])}>{label}</button>)}</div><div className={styles.playButtons}><span>{balancePlacements.length}/{challenge.items?.length ?? 0} placed</span><button className={styles.primary} disabled={!ready || balancePlacements.length !== challenge.items?.length} onClick={() => void act("finish-balance", { challengeId: challenge.id, placements: balancePlacements })}>Check tower</button></div><small>Earn 8 coins per win for your first three wins each day.</small></> : <><p className={styles.question}>{challenge.question}</p><div className={styles.answers}>{challenge.choices?.map((choice, i) => <button key={i} disabled={!ready} onClick={() => void act("answer", { challengeId: challenge.id, choice: i })}>{choice}</button>)}</div><small>Earn 6 coins per lesson for your first three lessons each day.</small></>}
          </div>}
        </div>
        <aside className={styles.sidebar}>
          <div className={styles.statusCard}><h3>A little love, every day <Heart size={16} /></h3><p>How your little friend is feeling</p><div className={styles.stats}>{STAT_META.map((stat) => <div key={stat.key}><div><span>{stat.emoji} {stat.label}</span><strong>{Math.round(pet[stat.key])}%</strong></div><div className={styles.meter} role="progressbar" aria-label={stat.label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pet[stat.key])}><span style={{ width: `${pet[stat.key]}%`, background: stat.color }} /></div></div>)}</div></div>
          <div className={styles.dailyCard}><span className={styles.eyebrow}><Sparkles size={14} /> Daily care trail</span><h3>Five little moments.</h3><p>Complete each activity for 30 coins and a friendship boost.</p><div className={styles.dailyTasks}>{CARE_TASKS.map((task) => <div key={task} className={pet.daily.tasks.includes(task) ? styles.done : ""}><span>{TASK_EMOJIS[task]}</span>{TASK_LABELS[task]}{pet.daily.tasks.includes(task) && <Check size={14} />}</div>)}</div>{pet.daily.rewarded ? <div className={styles.dailyDone}><Check size={16} /> Today&apos;s care badge collected!</div> : CARE_TASKS.every((t) => pet.daily.tasks.includes(t)) && <button className={styles.primary} disabled={busy} onClick={() => void act("wake")}>Collect care badge</button>}<div className={styles.streak}>🌱 {pet.streak} day{pet.streak === 1 ? "" : "s"} of growing together</div></div>
          <div className={styles.journal}><BookOpen size={18} /><div><strong>Our little story</strong><p>{pet.lessonsLearned} lessons · {pet.gamesPlayed} play dates</p><span>Next level in {60 - pet.xp % 60} friendship XP</span></div></div>
          <button onClick={() => setShowShop(true)} className={styles.shopBanner}><ShoppingBag size={21} /><span><strong>The cozy corner</strong><small>Accessories, décor & rooms</small></span><span>→</span></button>
          <p className={styles.smallNote}>Every activity saves automatically. Your pal rests while you&apos;re away and is always happy to welcome you back.</p>
        </aside>
      </div>
      {badge && <div className={styles.celebration}><span>🌟</span><div><strong>A day full of love!</strong><p>You and {pet.name} earned your daily care badge.</p></div><button aria-label="Dismiss celebration" onClick={() => setBadge(false)}><X size={18} /></button></div>}
      {showShop && <dialog ref={shopDialog} className={styles.shopDialog} aria-labelledby="pet-shop-title" onCancel={() => setShowShop(false)}><div className={styles.shopContent}><div className={styles.panelHeading}><div><span className={styles.eyebrow}>A treat for your best friend</span><h3 id="pet-shop-title">The cozy corner</h3></div><button aria-label="Close shop" onClick={() => setShowShop(false)}><X size={21} /></button></div><p>You have 🪙 {pet.coins} coins. Play, learn, and finish daily care to earn more.</p>{error && <p className={styles.error} role="alert">{error}</p>}<button className={styles.refill} disabled={busy || pet.coins < 5 || pet.dumplings > 14} onClick={() => void act("refill")}><span>🥟</span><div><strong>Dumpling basket</strong><small>Six warm dumplings</small></div><strong>🪙 5</strong></button><h4 className={styles.shopSection}>Move rooms</h4><div className={styles.roomChoices}><button disabled={busy || pet.room === "home"} onClick={() => void act("equip", { itemId: "home" })}><span>🏠</span><strong>Cozy home</strong><small>{pet.room === "home" ? "Here now ✓" : "Move here"}</small></button>{rooms.map((item) => { const owned = pet.owned.includes(item.id); const current = pet.room === item.id; return <button key={item.id} disabled={busy || current || (!owned && pet.coins < item.cost)} onClick={() => void act(owned ? "equip" : "buy", { itemId: item.id })}><span>{item.emoji}</span><strong>{item.name}</strong><small>{current ? "Here now ✓" : owned ? "Move here" : `🪙 ${item.cost}`}</small></button>; })}</div><h4 className={styles.shopSection}>Room décor</h4><p className={styles.shopHint}>Decorations are placed automatically and travel with your pal to every room.</p><div className={styles.shopGrid}>{PET_SHOP.filter((item) => item.kind !== "room").map((item) => { const owned = pet.owned.includes(item.id); const equipped = pet.accessory === item.id; const decor = item.kind === "decor"; return <button key={item.id} disabled={busy || equipped || owned || (!owned && pet.coins < item.cost)} onClick={() => void act(owned ? "equip" : "buy", { itemId: item.id })}><span>{item.emoji}</span><strong>{item.name}</strong><small>{equipped ? "Wearing ✓" : owned && decor ? "Placed ✓" : owned ? "Use this" : `🪙 ${item.cost}`}</small></button>; })}</div><div className={styles.playButtons}><button disabled={busy} onClick={() => void act("equip", { itemId: "none" })}>Remove accessory</button></div></div></dialog>}
    </section>
  );
}
