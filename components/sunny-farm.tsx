"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowLeft, Check, Heart, LoaderCircle, Volume2, VolumeX } from "lucide-react";
import { activeTargets, completedTasks, FARM_TASKS, farmReady, taskComplete, taskDefinition, type FarmState, type FarmTaskId } from "@/lib/sunny-farm";
import { FarmWorkbench, FarmWorkTarget } from "./sunny-farm-tools";
import { farmTool } from "@/lib/sunny-farm-tools";
import { FarmSprite, type FarmItem } from "@/components/sunny-farm-art";
import styles from "./sunny-farm.module.css";

type SavedFarm = { farm: FarmState; version: number; reward?: { points: number; tickets: number } | null };
const positions = [[15, 37], [38, 39], [61, 38], [84, 36], [16, 74], [39, 76], [62, 74], [85, 73]];
const inventoryIcons = { hay: "🌾", eggs: "🥚", milk: "🥛", wool: "🧶", apples: "🍎", carrots: "🥕" };
const place = (x: number, y: number, width?: number): CSSProperties => ({ left: `${x}%`, top: `${y}%`, ...(width ? { width: `${width}%` } : {}) });

export function SunnyFarm({ memberId, playerName, onExit }: { memberId: string; playerName: string; onExit: () => void }) {
  const [saved, setSaved] = useState<SavedFarm | null>(null);
  const [taskId, setTaskId] = useState<FarmTaskId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Welcome, little farmer! Choose somewhere to help.");
  const [sound, setSound] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);
  const titleRef = useRef<HTMLHeadingElement>(null);
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
  useEffect(() => { titleRef.current?.focus(); }, [taskId]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);
  function speak(text: string) {
    if (!sound || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text); speech.rate = 0.85;
    window.speechSynthesis.speak(speech);
  }
  function openTask(id: FarmTaskId) {
    setTaskId(id); setError(""); setMessage(taskDefinition(id)!.hint); speak(taskDefinition(id)!.hint);
  }
  async function act(action: "help" | "celebrate" | "next-day", target?: string, tool?: string) {
    if (!saved || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError("");
    try {
      const res = await fetch("/api/sunny-farm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, version: saved.version, action, task: taskId, target, tool }) });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) await load();
        throw new Error(data.error ?? "Your farm could not save. Try again.");
      }
      setSaved(data);
      const text = action === "celebrate" ? "What a happy farm! You helped everyone today." : action === "next-day" ? "A fresh farm day! Where shall we help first?" : taskId && taskComplete(data.farm, taskId) ? "Lovely work! This farm stop is all done." : "Good helping! Your progress is saved.";
      setMessage(text); speak(text);
      if (action === "next-day") setTaskId(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); }
    finally { inFlight.current = false; setBusy(false); }
  }
  const task = taskDefinition(taskId);
  const farm = saved?.farm;
  const count = farm ? completedTasks(farm) : 0;
  const targets = farm && task ? activeTargets(farm, task.id) : [];
  const done = farm && task ? taskComplete(farm, task.id) : false;
  const needsHay = farm && task && (task.id === "horse" || task.id === "cow") && targets.includes("feed") && farm.inventory.hay < 1;

  return <section className={styles.farm} aria-label="Sunny Farm Helpers">
    <header className={styles.header}>
      <button type="button" className={styles.smallButton} onClick={onExit}><ArrowLeft size={17} /> Games</button>
      <div className={styles.brand}><span className={styles.eyebrow}>A little care. A lot of happy.</span><h2>Sunny Farm Helpers<span aria-hidden="true"> ☀</span></h2></div>
      <button type="button" className={styles.smallButton} aria-label={sound ? "Turn narration off" : "Turn narration on"} aria-pressed={sound} onClick={() => { if (sound) window.speechSynthesis?.cancel(); setSound(!sound); }}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button>
    </header>
    {!loaded ? <div className={styles.loading}><LoaderCircle className="animate-spin" /> Opening your farm…</div> : !farm ? <div className={styles.loading}><p role="alert">{error}</p><button className={styles.primary} onClick={() => { setLoaded(false); void load(); }}>Try again</button></div> : <>
      <div className={styles.daybar}><span><strong>{playerName}&apos;s farm</strong> · Day {farm.round}</span><div className={styles.hearts} aria-label={`${count} of 8 farm stops complete`}>{FARM_TASKS.map(t => <Heart key={t.id} size={19} fill={taskComplete(farm, t.id) ? "#e99473" : "none"} color={taskComplete(farm, t.id) ? "#d67856" : "#c4c7ac"} />)}</div><span className={styles.saved}>{busy ? "Saving…" : "✓ Saved"}</span></div>
      {farm.celebrated ? <div className={styles.celebration} style={{ backgroundImage: "linear-gradient(#fff8e6cf,#fff8e6eb),url('/games/sunny-farm/hub.webp')" }}>
        <div className={styles.ribbon}>★ FARM HELPER ★</div><h3>Everyone is happy!</h3><p>You gathered, grew, and gave a little love.</p>
        <div className={styles.animalParade}>{(["horse", "cow", "sheep", "chicken"] as const).map(animal => <FarmSprite key={animal} animal={animal} pose={5} />)}</div>
        <p>Farm days completed: <strong>{farm.completedDays}</strong></p>
        {!!saved?.reward && (saved.reward.points > 0 || saved.reward.tickets > 0) && <p>You earned {saved.reward.points || saved.reward.tickets} {saved.reward.points ? "points" : "tickets"}!</p>}
        <button className={styles.primary} disabled={busy} onClick={() => void act("next-day")}>Start another farm day →</button><button className={styles.textButton} onClick={onExit}>Back to Games</button>
      </div> : task ? <>
        <div className={styles.activityHeader}><button className={styles.smallButton} onClick={() => { setTaskId(null); setError(""); setMessage("Choose another spot to help."); }}><ArrowLeft size={17} /> Farm map</button><div><span className={styles.eyebrow}>{task.verb}</span><h3 ref={titleRef} tabIndex={-1}>{task.title}</h3></div><span className={styles.activityIcon} aria-hidden="true">{task.icon}</span></div>
        <div className={styles.instructions}><span aria-hidden="true">{done ? "💛" : "👉"}</span><p>{done ? "All done! Thank you for taking care of the farm." : needsHay ? "Your friends need hay. Gather some in the hayfield first!" : farmTool(task.id, targets[0] ?? "").instruction}</p>{needsHay && <button className={styles.primary} onClick={() => openTask("hay")}>Go to hayfield</button>}</div>
        <FarmWorkbench key={task.id} task={task.id} targets={targets} busy={busy || !!needsHay} onComplete={(target, tool) => void act("help", target, tool)}>
        <div className={`${styles.scene} ${styles.activityScene} ${task.id === "garden" ? styles.gardenScene : ""}`} style={{ backgroundImage: `url('/games/sunny-farm/${task.scene}.webp')` }} aria-label={`${task.title} activity`}>
          <ActivityArtwork taskId={task.id} farm={farm} targets={targets} busy={busy || !!needsHay} />
          {done && <div className={styles.doneBadge}><Check /> Happy & cared for!</div>}
        </div>
        </FarmWorkbench>
        <div className={styles.activityFooter}><span>{farm.done[task.id].length} / {task.stages.flat().length} little steps</span><div className={styles.stepTrack}><span style={{ width: `${farm.done[task.id].length / task.stages.flat().length * 100}%` }} /></div>{done && <button className={styles.primary} onClick={() => { setTaskId(null); setMessage("Another happy friend! Choose your next farm stop."); }}>Back to the farm →</button>}</div>
      </> : <>
        <div className={styles.mapHeading}><div><span className={styles.eyebrow}>Welcome to your sunny little corner</span><h3 ref={titleRef} tabIndex={-1}>Who shall we help today?</h3></div><span className={styles.dayPill}>{count} / 8 happy stops</span></div>
        <div className={`${styles.scene} ${styles.map}`} style={{ backgroundImage: "url('/games/sunny-farm/hub.webp')" }}>
          <div className={styles.mapStops}>{FARM_TASKS.map((t, index) => <button key={t.id} className={`${styles.mapStop} ${taskComplete(farm, t.id) ? styles.completeStop : ""}`} style={place(...positions[index] as [number, number])} onClick={() => openTask(t.id)} aria-label={`${t.title}: ${taskComplete(farm, t.id) ? "all done" : t.verb}`}>
            <span className={styles.stopArt}>{t.id === "hay" ? <FarmSprite item="tractor" /> : t.id === "horse" ? <FarmSprite animal="horse" /> : t.id === "cow" ? <FarmSprite animal="cow" /> : t.id === "chickens" ? <FarmSprite animal="chicken" /> : t.id === "sheep" ? <FarmSprite animal="sheep" /> : t.id === "ducks" ? <FarmSprite item="swimming" /> : <FarmSprite item={t.id === "orchard" ? "tree" : "carrots"} />}</span>
            <span className={styles.stopLabel}>{taskComplete(farm, t.id) && <Check size={14} />} {t.title}</span><span className={styles.stopVerb}>{t.verb}</span>
          </button>)}</div>
        </div>
        <div className={styles.mapFooter}><span>Explore at your own pace. Every little bit helps.</span>{farmReady(farm) && <button className={styles.primary} disabled={busy} onClick={() => void act("celebrate")}>Celebrate our happy farm! ★</button>}</div>
      </>}
      <div className={styles.basketBar}><span className={styles.basketTitle}>Your farm basket</span>{Object.entries(farm.inventory).map(([name, amount]) => <span key={name} className={styles.inventory} aria-label={`${amount} ${name}`}><span aria-hidden="true">{inventoryIcons[name as keyof typeof inventoryIcons]}</span><strong>{amount}</strong><span>{name}</span></span>)}</div>
      <div className={styles.status} role="status" aria-live="polite">{busy ? "Saving your helping hands…" : message}</div>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </>}
  </section>;
}

function ActivityArtwork({ taskId: id, farm, targets, busy }: { taskId: FarmTaskId; farm: FarmState; targets: string[]; busy: boolean }) {
  const seen = (target: string) => farm.done[id].includes(target);
  const targetButton = (target: string, x: number, y: number, label: string, children: ReactNode, extra = "") => targets.includes(target) ? <FarmWorkTarget key={target} target={target} label={label} className={`${styles.target} ${extra}`} style={place(x, y)} disabled={busy}>{children}<span className={styles.targetLabel}>{label}</span></FarmWorkTarget> : null;
  const art = (item: FarmItem, x: number, y: number, width: number, extra = "") => <FarmSprite item={item} className={`${styles.prop} ${extra}`} style={place(x, y, width)} label={item === "tractor" ? "Farm tractor" : undefined} />;
  if (id === "hay") return <>
    {art("tractor", 3 + farm.done.hay.length * 18, 26, 40, styles.tractor)}
    {[0, 1, 2].map(i => targetButton(`bale-${i}`, 20 + i * 29, 72 - i * 8, `Collect hay ${i + 1}`, <span className={styles.hayBale} aria-hidden="true">🌾</span>))}
  </>;
  if (id === "horse") return <>
    <FarmSprite animal="horse" pose={taskComplete(farm, id) ? 5 : 0} className={styles.prop} style={place(25, 21, 50)} label="Your farm horse" />
    {targetButton("feed", 50, 79, "Feed hay", <span className={styles.feedTrough} aria-hidden="true">🌾</span>)}
    {[0, 1, 2].map(i => targetButton(`brush-${i}`, 42 + i * 9, 48 + (i % 2) * 12, `Brush spot ${i + 1}`, <span className={styles.dust}>✦</span>, styles.patch))}
    {seen("feed") && art("brush", 7, 70, 15)}
  </>;
  if (id === "cow") return <>
    <FarmSprite animal="cow" pose={taskComplete(farm, id) ? 5 : 0} className={styles.prop} style={place(22, 18, 49)} label="Your farm cow" />
    {art(seen("milk-finish") ? "milk" : "pail", 71, 61, 16)}
    {targetButton("feed", 51, 80, "Feed hay", <span className={styles.feedTrough} aria-hidden="true">🌾</span>)}
    {targetButton("milk-left", 39, 81, "Squeeze left", <span className={styles.handle}>↓</span>)}
    {targetButton("milk-right", 62, 81, "Squeeze right", <span className={styles.handle}>↓</span>)}
    {targetButton("milk-finish", 50, 81, "Finish milking", <span className={styles.handle}>↓</span>)}
    {seen("milk-left") && !seen("milk-finish") && <span className={styles.milkProgress} style={place(78, 53)}>{seen("milk-right") ? "⅔" : "⅓"} full</span>}
  </>;
  if (id === "chickens") return <>
    {[0, 1, 2].map(i => <FarmSprite key={i} animal="chicken" pose={seen("feed") ? 4 : 0} className={styles.prop} style={place(9 + i * 27, 57, 22)} />)}
    {targetButton("feed", 40, 44, "Scatter grain", <FarmSprite item="chickenFeed" />)}
    {[0, 1, 2].map(i => targetButton(`egg-${i}`, 57 + i * 16, 41, `Collect egg ${i + 1}`, <FarmSprite item="egg" />))}
    {art(farm.inventory.eggs ? "eggs" : "basket", 8, 22, 19)}
  </>;
  if (id === "sheep") return <>
    {[0, 1, 2].map(i => !seen(`herd-${i}`) ? targetButton(`herd-${i}`, 23 + i * 25, 60 + (i % 2) * 13, `Guide sheep ${i + 1}`, <FarmSprite animal="sheep" />, styles.sheepTarget) : null)}
    {farm.done.sheep.filter(x => x.startsWith("herd")).map((_, i) => <FarmSprite key={i} animal="sheep" pose={1} className={styles.prop} style={place(68 + i * 5, 19 + i * 6, 15)} />)}
    {!targets[0]?.startsWith("herd") && <>{art(taskComplete(farm, id) ? "shorn" : "sheep", 26, 34, 45)}{[0, 1, 2].map(i => targetButton(`wool-${i}`, 39 + i * 9, 52 + (i % 2) * 10, `Clip wool ${i + 1}`, <span className={styles.woolPatch}>☁</span>, styles.patch))}{art("clippers", 6, 76, 18)}</>}
  </>;
  if (id === "ducks") return <>
    {[0, 1, 2].map(i => targets.includes(`duck-${i}`) ? targetButton(`duck-${i}`, 22 + i * 28, 43 + (i % 2) * 20, `Feed duck ${i + 1}`, <FarmSprite item="swimming" />, styles.duckTarget) : <div key={i} className={styles.fedDuck} style={place(22 + i * 28, 43 + (i % 2) * 20)}><FarmSprite item="swimming" /><span>♥</span></div>)}
    {art("duckFeed", 5, 75, 15)}
  </>;
  if (id === "orchard") return <>
    {art("tree", 24, 4, 53)}
    {[0, 1, 2].map(i => targetButton(`apple-${i}`, 38 + i * 13, 30 + (i % 2) * 16, `Pick apple ${i + 1}`, <FarmSprite item="apple" />, styles.appleTarget))}
    {art("basket", 77, 75, 17)}
    {farm.inventory.apples > 0 && <span className={styles.appleCount} style={place(84, 78)}>🍎 {farm.inventory.apples}</span>}
  </>;
  return <>{Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3), col = i % 3;
    const x = [24, 50, 76][col] + (col - 1) * row * 3;
    const y = [44, 61, 81][row];
    const planted = seen(`plant-${i}`), watered = seen(`water-${i}`), harvested = seen(`harvest-${i}`);
    const current = targets.find(t => t.endsWith(`-${i}`));
    const label = current?.startsWith("plant") ? `Plant bed ${i + 1}` : current?.startsWith("water") ? `Water bed ${i + 1}` : `Harvest bed ${i + 1}`;
    const plants = <span className={styles.bedPlants}>{!harvested && planted && [0, 1, 2].map(n => <FarmSprite key={n} item={watered ? "carrotPlant" : "sprout"} />)}</span>;
    return <div key={i} className={`${styles.fieldBed} ${watered && !harvested ? styles.wetBed : ""}`} style={{ ...place(x, y), width: `${22 + row * 3}%` }}>
      {current ? <FarmWorkTarget target={current} label={label} disabled={busy} className={styles.bedTarget} style={{}}>{plants}<span className={styles.bedNumber}>{i + 1}</span></FarmWorkTarget> : plants}
    </div>;
  })}</>;
}
