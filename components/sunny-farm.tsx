"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Check, Heart, LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { FARM_CROPS, bedCrop, type FarmCropId, activeTargets, completedTasks, farmBreakfast, nextFarmStop, FARM_TASKS, farmReady, taskComplete, taskDefinition, type FarmState, type FarmTaskId } from "@/lib/sunny-farm";
import { FarmCollectionBasket, FarmWorkbench, FarmWorkTarget } from "./sunny-farm-tools";
import { useFarmAudio } from "./sunny-farm-audio";
import { FarmExplore } from "./sunny-farm-explore";
import { feedbackKind, responseAt, type FarmFeedbackKind, type FarmSound } from "@/lib/sunny-farm-feedback";
import { farmTool } from "@/lib/sunny-farm-tools";
import { FarmSprite, type FarmItem } from "@/components/sunny-farm-art";
import styles from "./sunny-farm.module.css";

type SavedFarm = { farm: FarmState; version: number; reward?: { points: number; tickets: number } | null };
const positions = [[15, 37], [38, 39], [61, 38], [84, 36], [16, 74], [39, 76], [62, 74], [85, 73]];
const inventoryIcons = { hay: "🌾", eggs: "🥚", milk: "🥛", wool: "🧶", apples: "🍎", carrots: "🥕", tomatoes: "🍅", corn: "🌽" };
const place = (x: number, y: number, width?: number): CSSProperties => ({ left: `${x}%`, top: `${y}%`, ...(width ? { width: `${width}%` } : {}) });

export function SunnyFarm({ memberId, playerName, onExit }: { memberId: string; playerName: string; onExit: () => void }) {
  const [saved, setSaved] = useState<SavedFarm | null>(null);
  const [taskId, setTaskId] = useState<FarmTaskId | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<FarmCropId>("carrot");
  const audio = useFarmAudio();
  const responses = useRef<Partial<Record<FarmFeedbackKind, number>>>({});
  function respond(kind: FarmFeedbackKind) { const count = responses.current[kind] ?? 0; responses.current[kind] = count + 1; return responseAt(kind, count); }
  const [reaction, setReaction] = useState<{ task: FarmTaskId; text: string; kind: "eat" | "happy" | "care" } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  useEffect(() => { if (!celebrating) return; const timer = window.setTimeout(() => setCelebrating(false), 1800); return () => window.clearTimeout(timer); }, [celebrating]);
  useEffect(() => { if (!reaction) return; const timer = window.setTimeout(() => setReaction(null), 1400); return () => window.clearTimeout(timer); }, [reaction]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Welcome, little farmer! Choose somewhere to help.");
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const farmInfoRef = useRef<HTMLDetailsElement>(null);
  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/sunny-farm?memberId=${encodeURIComponent(memberId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open your farm.");
      setSaved(data); setError("");
    } catch (err) { setError(err instanceof Error ? err.message : "Could not open your farm."); }
    finally { setLoaded(true); }
  }, [memberId]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { titleRef.current?.focus({ preventScroll: true }); }, [taskId]);
  function openTask(id: FarmTaskId) {
    if (farmInfoRef.current) farmInfoRef.current.open = false;
    setReaction(null); setTaskId(id); setError(""); setMessage(taskDefinition(id)!.hint);
    audio.say(`Let’s visit the ${taskDefinition(id)!.title.toLowerCase()}.`);
  }
  function explore(text: string, effect: FarmSound) { setMessage(text); audio.play(effect); }
  async function act(action: "help" | "celebrate" | "next-day", target?: string, tool?: string) {
    if (!saved || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/api/sunny-farm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, version: saved.version, action, task: taskId, target, tool, ...(taskId === "garden" && target?.startsWith("plant-") ? { crop: selectedCrop } : {}) }) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) await load();
        throw new Error(data.error ?? "Your farm could not save. Try again.");
      }
      setSaved(data);
      if (action === "help" && taskId) {
        const kind = feedbackKind(taskId, target ?? "");
        const text = respond(taskComplete(data.farm, taskId) ? "complete" : kind);
        setReaction({ task: taskId, text, kind: kind === "feed" ? "eat" : taskComplete(data.farm, taskId) ? "happy" : "care" });
        setMessage(text);
        const animal: Partial<Record<FarmTaskId, FarmSound>> = { horse: "horse", cow: "cow", chickens: "chickens", sheep: "sheep", ducks: "ducks" };
        audio.play((kind === "feed" || target?.startsWith("herd")) && animal[taskId] ? animal[taskId]! : taskComplete(data.farm, taskId) ? "success" : "collect");
        // One optional line at the end of a job, never a spoken message for every little step.
        if (taskComplete(data.farm, taskId)) audio.say(text);
      } else if (action === "celebrate") {
        setCelebrating(true); const text = respond("celebrate"); setMessage(text); audio.play("success"); audio.say(text);
      } else { setMessage("A fresh farm day! Where shall we help first?"); }
      if (action === "next-day") setTaskId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const task = taskDefinition(taskId);
  const farm = saved?.farm;
  const count = farm ? completedTasks(farm) : 0;
  const targets = farm && task ? activeTargets(farm, task.id) : [];
  const done = farm && task ? taskComplete(farm, task.id) : false;
  const nextStop = farm ? nextFarmStop(farm) : null;
  const breakfast = farm ? farmBreakfast(farm) : [];

  return <section className={styles.farm} aria-label="Sunny Farm Helpers">
    <header className={styles.header}>
      <button type="button" className={styles.smallButton} onClick={onExit}><ArrowLeft size={17} /> Games</button>
      <div className={styles.brand}><span className={styles.eyebrow}>A little care. A lot of happy.</span><h2>Sunny Farm Helpers<span aria-hidden="true"> ☀</span></h2></div>
      <button type="button" className={styles.smallButton} aria-label={audio.effects ? "Turn farm sounds off" : "Turn farm sounds on"} aria-pressed={audio.effects} onClick={audio.toggleEffects}>{audio.effects ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
      <details className={styles.audioSettings}><summary>Audio settings</summary><div>
        <label>Volume <input aria-label="Farm audio volume" type="range" min="0" max="0.7" step="0.05" value={audio.volume} onChange={e => audio.setVolume(Number(e.target.value))} /></label>
        <label><input type="checkbox" checked={audio.narration} onChange={e => audio.setNarration(e.target.checked)} /> Spoken guidance</label>
        <p>Animal sounds work without a reader. Spoken guidance gives a short welcome and a little encouragement after a job.</p>
        {audio.narration && <><label>Reader voice <select aria-label="Reader voice" value={audio.voiceURI} onChange={e => audio.setVoiceURI(e.target.value)}><option value="">Preferred English voice</option>{audio.voices.map(v => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}</select></label><p>Voice quality depends on the voices installed on this device.</p><button type="button" className={styles.smallButton} onClick={() => audio.say("Hello, little farmer. Ready to explore?", true)}>Preview voice</button></>}
      </div></details>
    </header>
    {!loaded ? <div className={styles.loading}><LoaderCircle className="animate-spin" /> Opening your farm…</div> : !farm ? <div className={styles.loading}><p role="alert">{error}</p><button className={styles.primary} onClick={() => { setLoaded(false); void load(); }}>Try again</button></div> : <>
      <div className={styles.daybar}><span><strong>{playerName}&apos;s farm</strong> · Day {farm.round}</span><div className={styles.hearts} aria-label={`${count} of 8 farm stops complete`}>{FARM_TASKS.map(t => <Heart key={t.id} size={19} fill={taskComplete(farm, t.id) ? "#e99473" : "none"} color={taskComplete(farm, t.id) ? "#d67856" : "#c4c7ac"} />)}</div><span className={styles.saved}>{busy ? "Saving…" : "✓ Saved"}</span></div>
      <details ref={farmInfoRef} className={styles.farmInfo}><summary>🧺 Your farm basket & breakfast trail</summary><div className={styles.infoContent}>
      {!farm.celebrated && <div className={styles.journey}><div><strong>{breakfast.every(g => g.ready) ? "Breakfast basket ready!" : "Let’s make a farm breakfast!"}</strong><span>Happy hens → eggs · happy cow → milk · orchard → apples</span></div><div className={styles.journeyGoods}>{breakfast.map(g => <button key={g.item} onClick={() => openTask(g.task)} aria-label={`Breakfast ${g.label}: ${g.amount} of ${g.goal}`}><span aria-hidden="true">{inventoryIcons[g.item]}</span> {Math.min(g.amount, g.goal)}/{g.goal} {g.label} {g.ready && "✓"}</button>)}</div></div>}
      <div className={styles.basketBar}><span className={styles.basketTitle}>Your farm basket</span>{Object.entries({ ...farm.inventory, tomatoes: farm.inventory.tomatoes ?? 0, corn: farm.inventory.corn ?? 0 }).map(([name, amount]) => <span key={name} className={styles.inventory} aria-label={`${amount} ${name}`}><span aria-hidden="true">{inventoryIcons[name as keyof typeof inventoryIcons]}</span><strong>{amount}</strong><span>{name}</span></span>)}</div>
      </div></details>
      {farm.celebrated ? <div className={styles.celebration} style={{ backgroundImage: "linear-gradient(#fff8e6cf,#fff8e6eb),url('/games/sunny-farm/hub.webp')" }}>
        <div className={styles.ribbon}>★ FARM HELPER ★</div><h3>Everyone is happy!</h3><p>You gathered, grew, and gave a little love.</p>
        <div className={styles.animalParade}>{(["horse", "cow", "sheep", "chicken"] as const).map(animal => <FarmSprite key={animal} animal={animal} pose={celebrating ? 5 : 0} />)}</div>
        <p>Farm days completed: <strong>{farm.completedDays}</strong></p>
        {!!saved?.reward && (saved.reward.points > 0 || saved.reward.tickets > 0) && <p>You earned {saved.reward.points || saved.reward.tickets} {saved.reward.points ? "points" : "tickets"}!</p>}
        <button className={styles.primary} disabled={busy} onClick={() => void act("next-day")}>Start another farm day →</button><button className={styles.textButton} onClick={onExit}>Back to Games</button>
      </div> : task ? <>
        <div className={styles.activityHeader}><button className={styles.smallButton} onClick={() => { setTaskId(null); setError(""); setMessage("Choose another spot to help."); }}><ArrowLeft size={17} /> Farm map</button><div><span className={styles.eyebrow}>{task.verb}</span><h3 ref={titleRef} tabIndex={-1}>{task.title}</h3></div><span className={styles.activityIcon} aria-hidden="true">{task.icon}</span></div>
        {done && <div className={styles.instructions}><span aria-hidden="true">{done ? "💛" : "👉"}</span><p>{done ? "All done! Thank you for taking care of the farm." : farmTool(task.id, targets[0] ?? "").instruction}</p></div>}
        {task.id === "garden" && targets[0]?.startsWith("plant-") && <div className={styles.cropPicker} role="group" aria-label="Choose seeds">
          <strong>Choose seeds for your next bed</strong>
          {FARM_CROPS.map(crop => <button type="button" key={crop.id} aria-pressed={selectedCrop === crop.id} disabled={busy} onClick={() => setSelectedCrop(crop.id)}><span aria-hidden="true">{crop.icon}</span> {crop.label}</button>)}
          <span>Pick seeds, then plant an empty bed. Mix crops in your garden!</span>
        </div>}
        <FarmWorkbench key={task.id} task={task.id} targets={targets} busy={busy} onComplete={(target, tool) => void act("help", target, tool)}>
        <div className={`${styles.scene} ${styles.activityScene} ${task.id === "garden" ? styles.gardenScene : ""}`} style={{ backgroundImage: `url('/games/sunny-farm/${task.scene}.webp')` }} aria-label={`${task.title} activity`}>
          <ActivityArtwork taskId={task.id} farm={farm} targets={targets} busy={busy} eating={reaction?.task === task.id && reaction.kind === "eat"} happy={reaction?.task === task.id && reaction.kind === "happy"} />
          <FarmExplore key={task.id} scene={task.id} onExplore={explore} />
          {reaction?.task === task.id && <div className={styles.careReaction} aria-hidden="true">{reaction.text}</div>}
          {done && <div className={styles.doneBadge}><Check /> Happy & cared for!</div>}
        </div>
        </FarmWorkbench>
        <p className={styles.exploreHint}>Explore too: tap the little ✦ surprises around the scene.</p>
        <div className={styles.activityFooter}><button type="button" className={styles.smallButton} onClick={() => { const hint = farmTool(task.id, targets[0] ?? "").instruction; setMessage(hint); audio.say(hint, true); }}>Hear or read a hint</button><span>{farm.done[task.id].length} / {task.stages.flat().length} little steps</span><div className={styles.stepTrack}><span style={{ width: `${farm.done[task.id].length / task.stages.flat().length * 100}%` }} /></div>{done && nextStop && <button className={styles.primary} onClick={() => openTask(nextStop)}>Next: {taskDefinition(nextStop)!.title} →</button>}{done && <button className={styles.smallButton} onClick={() => { setTaskId(null); setMessage("Another happy friend! Choose your next farm stop."); }}>Back to the farm →</button>}</div>
      </> : <>
        <div className={styles.mapHeading}><div><span className={styles.eyebrow}>Welcome to your sunny little corner</span><h3 ref={titleRef} tabIndex={-1}>Who shall we help today?</h3></div><span className={styles.dayPill}>{count} / 8 happy stops</span></div>
        <div className={`${styles.scene} ${styles.map}`} style={{ backgroundImage: "url('/games/sunny-farm/hub.webp')" }}>
          <FarmExplore scene="map" onExplore={explore} />
          <div className={styles.mapStops}>{FARM_TASKS.map((t, index) => <button key={t.id} className={`${styles.mapStop} ${taskComplete(farm, t.id) ? styles.completeStop : ""}`} style={place(...positions[index] as [number, number])} onClick={() => openTask(t.id)} aria-label={`${t.title}: ${taskComplete(farm, t.id) ? "all done" : t.verb}`}>
            <span className={styles.stopArt}>{t.id === "hay" ? <FarmSprite item="tractor" /> : t.id === "horse" ? <FarmSprite animal="horse" /> : t.id === "cow" ? <FarmSprite animal="cow" /> : t.id === "chickens" ? <FarmSprite animal="chicken" /> : t.id === "sheep" ? <FarmSprite animal="sheep" /> : t.id === "ducks" ? <FarmSprite item="swimming" /> : <FarmSprite item={t.id === "orchard" ? "tree" : "carrots"} />}</span>
            <span className={styles.stopLabel}>{taskComplete(farm, t.id) && <Check size={14} />} {t.title}</span><span className={styles.stopVerb}>{t.verb}</span>
          </button>)}</div>
        </div>
        <div className={styles.mapFooter}><span>Explore freely, or follow the farm trail.</span>{nextStop && <button className={styles.primary} onClick={() => openTask(nextStop)}>Let’s visit the {taskDefinition(nextStop)!.title.toLowerCase()} →</button>}{farmReady(farm) && <button className={styles.primary} disabled={busy} onClick={() => void act("celebrate")}>Celebrate our happy farm! ★</button>}</div>
      </>}
      <div className={styles.status} role="status" aria-live="polite">{busy ? "Saving your helping hands…" : message}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </>}
  </section>;
}

function ActivityArtwork({ taskId: id, farm, targets, busy, eating, happy }: { taskId: FarmTaskId; farm: FarmState; targets: string[]; busy: boolean; eating?: boolean; happy?: boolean }) {
  const seen = (target: string) => farm.done[id].includes(target);
  const targetButton = (target: string, x: number, y: number, label: string, children: ReactNode, extra = "") => targets.includes(target) ? <FarmWorkTarget key={`${target}-${label}`} target={target} label={label} className={`${styles.target} ${extra}`} style={place(x, y)} disabled={busy}>{children}<span className={styles.targetLabel}>{label}</span></FarmWorkTarget> : null;
  const art = (item: FarmItem, x: number, y: number, width: number, extra = "") => <FarmSprite item={item} className={`${styles.prop} ${extra}`} style={place(x, y, width)} label={item === "tractor" ? "Farm tractor" : undefined} />;
  if (id === "hay") return <>
    {art("tractor", 3 + farm.done.hay.length * 18, 26, 40, styles.tractor)}
    {[0, 1, 2].map(i => targetButton(`bale-${i}`, 20 + i * 29, 72 - i * 8, `Collect hay ${i + 1}`, <span className={styles.hayBale} aria-hidden="true">🌾</span>))}
  </>;
  if (id === "horse") return <>
    <div className={`${styles.animalBody} ${styles.horseBody}`}>
      {targets.includes("feed") ? targetButton("feed", 50, 50, "Feed horse", <FarmSprite animal="horse" pose={0} className={styles.animalSprite} label="Your farm horse" />, styles.directAnimal) : <FarmSprite animal="horse" pose={eating ? 4 : happy ? 5 : 0} className={styles.animalSprite} label="Your farm horse" />}
      {[0, 1, 2].map(i => targetButton(`brush-${i}`, 31 + i * 15, 60 - i * 3, `Brush spot ${i + 1}`, <span className={styles.dust}>✦</span>, styles.patch))}
    </div>
  </>;
  if (id === "cow") return <>
    <div className={`${styles.animalBody} ${styles.cowBody}`}>
      {targets.includes("feed") ? targetButton("feed", 50, 50, "Feed cow", <FarmSprite animal="cow" pose={0} className={styles.animalSprite} label="Your farm cow" />, styles.directAnimal) : <FarmSprite animal="cow" pose={eating ? 4 : happy ? 5 : 0} className={styles.animalSprite} label="Your farm cow" />}
      {targetButton("milk-left", 32, 82, "Squeeze left", <span className={styles.handle}>↓</span>)}
      {targetButton("milk-right", 45, 82, "Squeeze right", <span className={styles.handle}>↓</span>)}
      {targetButton("milk-finish", 38, 82, "Finish milking", <span className={styles.handle}>↓</span>)}
      {art(seen("milk-finish") ? "milk" : "pail", 59, 75, 24)}
      {seen("milk-left") && !seen("milk-finish") && <span className={styles.milkProgress} style={place(68, 69)}>{seen("milk-right") ? "⅔" : "⅓"} full</span>}
    </div>
  </>;
  if (id === "chickens") return <>
    {[0, 1, 2].map(i => targets.includes("feed") ? targetButton("feed", 36 + i * 25, 74, `Feed chicken ${i + 1}`, <FarmSprite animal="chicken" pose={0} />, styles.chickenFriend) : <FarmSprite key={i} animal="chicken" pose={eating ? 4 : 0} className={styles.prop} style={place(25 + i * 25, 56, 20)} />)}
    {[0, 1, 2].map(i => targetButton(`egg-${i}`, 57 + i * 16, 39, `Collect egg ${i + 1}`, <FarmSprite item="egg" />, styles.nestEgg))}
    <FarmCollectionBasket count={farm.inventory.eggs} style={place(3, 69, 22)} />
  </>;
  if (id === "sheep") return <>
    {[0, 1, 2].map(i => !seen(`herd-${i}`) ? targetButton(`herd-${i}`, 23 + i * 25, 60 + (i % 2) * 13, `Guide sheep ${i + 1}`, <FarmSprite animal="sheep" />, styles.sheepTarget) : null)}
    {farm.done.sheep.filter(x => x.startsWith("herd")).map((_, i) => <FarmSprite key={i} animal="sheep" pose={1} className={styles.prop} style={place(68 + i * 5, 19 + i * 6, 15)} />)}
    {!targets[0]?.startsWith("herd") && <>{art(taskComplete(farm, id) ? "shorn" : "sheep", 26, 34, 45)}{[0, 1, 2].map(i => targetButton(`wool-${i}`, 39 + i * 9, 52 + (i % 2) * 10, `Clip wool ${i + 1}`, <span className={styles.woolPatch}>☁</span>, styles.patch))}{art("clippers", 6, 76, 18)}</>}
  </>;
  if (id === "ducks") return <>
    {[0, 1, 2].map(i => targets.includes(`duck-${i}`) ? targetButton(`duck-${i}`, 22 + i * 28, 43 + (i % 2) * 20, `Feed duck ${i + 1}`, <FarmSprite item="swimming" />, styles.duckTarget) : <div key={i} className={styles.fedDuck} style={place(22 + i * 28, 43 + (i % 2) * 20)}><FarmSprite item="swimming" />{eating && <span>♥</span>}</div>)}
    {art("duckFeed", 5, 75, 15)}
  </>;
  if (id === "orchard") return <>
    {art("tree", 24, 4, 53)}
    {[0, 1, 2].map(i => targetButton(`apple-${i}`, 38 + i * 13, 30 + (i % 2) * 16, `Pick apple ${i + 1}`, <FarmSprite item="apple" />, styles.appleTarget))}
    <FarmCollectionBasket kind="apple" count={farm.inventory.apples} style={place(73, 72, 23)} />
  </>;
  return <>{Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    const x = [24, 50, 76][col] + (col - 1) * row * 3;
    const y = [44, 61, 81][row];
    const planted = seen(`plant-${i}`), watered = seen(`water-${i}`), harvested = seen(`harvest-${i}`);
    const current = targets.find(t => t.endsWith(`-${i}`));
    const label = current?.startsWith("plant") ? `Plant bed ${i + 1}` : current?.startsWith("water") ? `Water bed ${i + 1}` : `Harvest bed ${i + 1}`;
    const crop = bedCrop(farm, i);
    const plants = <span className={styles.bedPlants}>{!harvested && planted && [0, 1, 2].map(n => <FarmSprite key={n} item={watered ? crop.plant : "sprout"} />)}</span>;
    return <div key={i} data-crop={planted ? crop.id : undefined} title={planted ? `Bed ${i + 1}: ${crop.label}` : undefined} className={`${styles.fieldBed} ${watered && !harvested ? styles.wetBed : ""}`} style={{ ...place(x, y), width: `${22 + row * 3}%` }}>
      {current ? <FarmWorkTarget target={current} label={label} disabled={busy} className={styles.bedTarget} style={{}}>{plants}<span className={styles.bedNumber}>{i + 1}</span></FarmWorkTarget> : plants}
    </div>;
  })}</>;
}
