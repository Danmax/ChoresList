"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import Link from "next/link";
import { Check, Eye, EyeOff, Flower2, Home, Pencil, Play, RotateCcw, Sparkles, Square, Volume2, VolumeX } from "lucide-react";
import { advanceTrace, distance, letterExample, letterStrokes, LETTER_LESSONS, lessonFor, readLetterGardenProgress, strokeFinished, strokePath, TRACING_LINES, type LetterCase, type LetterGardenProgress, type TracePoint } from "@/lib/letter-garden";
import { DEFAULT_MELODY_SOUND, readMelodySound, type MelodySoundSettings } from "@/lib/melody-sound";
import { useMelodyAudio } from "./melody-phone-audio";
import styles from "./letter-garden.module.css";

type TracePosition = { stroke: number; point: number };
type DemoPosition = { stroke: number; fraction: number };
type Props = { playerId?: string; onExit?: () => void; onFinish?: (score: number, duration: number, metadata: Record<string, unknown>) => Promise<void> };

export function LetterGarden({ playerId, onExit, onFinish }: Props) {
  const [progress, setProgress] = useState<LetterGardenProgress>(() => readLetterGardenProgress(null));
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<TracePosition>({ stroke: 0, point: 0 });
  const trace = useRef(position);
  const [message, setMessage] = useState<string>(TRACING_LINES.welcome);
  const [muted, setMuted] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_MELODY_SOUND);
  const audio = useMelodyAudio(muted, settings);
  const [demonstrating, setDemonstrating] = useState(false);
  const [demo, setDemo] = useState<DemoPosition | null>(null);
  const [cursor, setCursor] = useState<TracePoint | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const board = useRef<SVGSVGElement>(null);
  const input = useRef<{ id: number | "keyboard"; last: TracePoint } | null>(null);
  const loaded = useRef(false);
  const startedAt = useRef<number | null>(null);
  const practiced = useRef(new Set<string>());
  const hintAt = useRef(0);
  const savingRef = useRef(false);
  const lesson = lessonFor(progress.selected);
  const strokes = useMemo(() => letterStrokes(lesson, progress.letterCase), [lesson, progress.letterCase]);
  const complete = position.stroke >= strokes.length;
  const activeStroke = strokes[position.stroke];
  const activePoint = activeStroke?.points[position.point];
  const lessonId = `${lesson.letter}:${progress.letterCase}`;
  const storageKey = `letter-garden:v1:${playerId ?? "guest"}`;

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    try { setProgress(readLetterGardenProgress(JSON.parse(localStorage.getItem(storageKey) ?? "null"))); } catch { /* Start with a fresh garden. */ }
    try { setSettings(readMelodySound(JSON.parse(localStorage.getItem("melody-sound:v1") ?? "null"))); } catch { /* Keep the natural voice. */ }
    setReady(true);
  }, [storageKey]);

  useEffect(() => {
    if (ready) try { localStorage.setItem(storageKey, JSON.stringify(progress)); } catch { /* Practice still works without storage. */ }
  }, [ready, storageKey, progress]);

  useEffect(() => {
    const hidden = () => {
      if (document.hidden) { setDemonstrating(false); input.current = null; setCursor(null); audio.stop(); }
    };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, [audio.stop]);

  useEffect(() => {
    if (!demonstrating) { setDemo(null); return; }
    let frame = 0, announced = -1;
    const start = performance.now() + 3000;
    const durations = strokes.map(stroke => Math.max(2300, stroke.instruction.split(/\s+/).length * 450));
    const animate = (time: number) => {
      let elapsed = time - start;
      if (elapsed < 0) { frame = requestAnimationFrame(animate); return; }
      let index = 0;
      while (index < strokes.length && elapsed >= durations[index] + 550) { elapsed -= durations[index] + 550; index++; }
      if (index >= strokes.length) {
        setDemonstrating(false); setMessage(TRACING_LINES.welcome); audio.speak(TRACING_LINES.welcome); return;
      }
      if (announced !== index) { announced = index; setMessage(strokes[index].instruction); audio.speak(strokes[index].instruction); }
      setDemo({ stroke: index, fraction: Math.min(1, elapsed / durations[index]) });
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [demonstrating, strokes, audio.speak]);

  function tell(text: string) { setMessage(text); audio.speak(text); }
  function activate() { audio.activate(); startedAt.current ??= Date.now(); }
  function stopDemo() { setDemonstrating(false); setDemo(null); audio.stopSpeech(); }
  function updateTrace(next: TracePosition) { trace.current = next; setPosition(next); }

  function choose(letter: string, letterCase = progress.letterCase) {
    stopDemo(); input.current = null; setCursor(null); updateTrace({ stroke: 0, point: 0 });
    setProgress(current => ({ ...current, selected: letter, letterCase }));
    activate();
    const next = lessonFor(letter);
    tell(`${letterExample(next)} ${TRACING_LINES[letterCase]} ${next[letterCase][0].instruction}`);
  }

  function reset() {
    stopDemo(); input.current = null; setCursor(null); updateTrace({ stroke: 0, point: 0 });
    activate(); tell(TRACING_LINES.reset);
  }

  function startDemo() {
    activate(); stopDemo(); input.current = null; setCursor(null);
    setMessage(TRACING_LINES.demo); audio.speak(letterExample(lesson));
    setDemonstrating(true);
  }

  function begin(point: TracePoint, id: number | "keyboard"): boolean {
    if (saving || complete || input.current) return false;
    activate(); stopDemo();
    const target = strokes[trace.current.stroke]?.points[trace.current.point];
    if (!target || distance(point, target) > 24) { tell(TRACING_LINES.retry); return false; }
    input.current = { id, last: point }; setCursor(point);
    return true;
  }

  function move(point: TracePoint) {
    const current = input.current;
    if (!current || complete || saving) return;
    const stroke = strokes[trace.current.stroke];
    if (!stroke) return;
    const nextPoint = advanceTrace(stroke.points, trace.current.point, current.last, point, progress.guided ? 23 : 19);
    updateTrace({ stroke: trace.current.stroke, point: nextPoint });
    current.last = point; setCursor(point);
    if (distance(point, stroke.points[nextPoint]) > 45 && Date.now() - hintAt.current > 4500) {
      hintAt.current = Date.now(); tell(TRACING_LINES.offTrail);
    }
  }

  function lift(cancel = false) {
    const current = input.current;
    if (!current) return;
    input.current = null; setCursor(null);
    const stroke = strokes[trace.current.stroke];
    if (!stroke || cancel) return;
    if (!strokeFinished(stroke, trace.current.point, current.last, progress.guided ? 23 : 19)) { tell(TRACING_LINES.resume); return; }
    const next = trace.current.stroke + 1;
    updateTrace({ stroke: next, point: 0 });
    if (next === strokes.length) {
      practiced.current.add(lessonId);
      setProgress(current => ({ ...current, completed: current.completed.includes(lessonId) ? current.completed : [...current.completed, lessonId] }));
      audio.effect("success"); tell(TRACING_LINES.complete);
    } else { audio.effect("pop"); tell(`${TRACING_LINES.stroke} ${strokes[next].instruction}`); }
  }

  function pointerPoint(event: { clientX: number; clientY: number }): TracePoint | null {
    const matrix = board.current?.getScreenCTM();
    if (!matrix) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: Math.max(-80, Math.min(440, point.x)), y: Math.max(-80, Math.min(480, point.y)) };
  }

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0) return;
    const point = pointerPoint(event);
    if (point && begin(point, event.pointerId)) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    if (input.current?.id !== event.pointerId) return;
    const samples = event.nativeEvent.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [event.nativeEvent]) { const point = pointerPoint(sample); if (point) move(point); }
  }

  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    if (input.current?.id !== event.pointerId) return;
    const point = pointerPoint(event); if (point) move(point);
    lift();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (event.key === "Escape") { stopDemo(); lift(true); return; }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (input.current?.id === "keyboard") lift();
      else if (activePoint) begin({ ...activePoint }, "keyboard");
      return;
    }
    if (input.current?.id !== "keyboard") return;
    const directions: Record<string, TracePoint> = { ArrowLeft: { x: -8, y: 0 }, ArrowRight: { x: 8, y: 0 }, ArrowUp: { x: 0, y: -8 }, ArrowDown: { x: 0, y: 8 } };
    const direction = directions[event.key];
    if (direction) { event.preventDefault(); move({ x: input.current.last.x + direction.x, y: input.current.last.y + direction.y }); }
  }

  async function exit() {
    if (savingRef.current) return;
    audio.stop();
    if (!onFinish || startedAt.current === null || practiced.current.size === 0) { onExit?.(); return; }
    savingRef.current = true; setSaving(true); setSaveError("");
    try { await onFinish(practiced.current.size, Math.round((Date.now() - startedAt.current) / 1000), { lettersPracticed: [...practiced.current], letterCase: progress.letterCase, guided: progress.guided }); }
    catch { setSaveError("We couldn't save this playtime. Try again, or leave your garden."); }
    finally { savingRef.current = false; setSaving(false); }
  }

  const demoPoint = demo && strokes[demo.stroke]?.points[Math.min(strokes[demo.stroke].points.length - 1, Math.floor(demo.fraction * (strokes[demo.stroke].points.length - 1)))];

  return <section className={styles.garden} aria-label="Letter Garden" data-letter={lesson.letter} data-letter-case={progress.letterCase} data-stroke={position.stroke} data-complete={complete}>
    <div className={styles.landscape} aria-hidden="true"><span /><span /><span /></div>
    <header className={styles.header}>
      <div className={styles.brand}><span><Flower2 size={25} /></span><div><strong>Little Letter Garden</strong><small>A little practice. A little growing.</small></div></div>
      <div className={styles.headerActions}>
        <button type="button" className={styles.iconButton} aria-label={muted ? "Turn sound on" : "Mute sound"} aria-pressed={muted} onClick={() => setMuted(value => !value)}>{muted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
        {onExit ? <button type="button" className={styles.iconButton} aria-label="Exit" disabled={saving} onClick={() => void exit()}><Home size={20} /></button> : <Link className={styles.iconButton} href="/" aria-label="Back to home"><Home size={20} /></Link>}
      </div>
    </header>

    <div className={styles.intro}><span>LET’S GROW A LITTLE LETTER</span><h1>{lesson.letter} is for <em>{lesson.word}</em> <span aria-hidden="true">{lesson.emoji}</span></h1><p>Watch it grow. Follow the trail. Make it yours.</p></div>

    <div className={styles.workspace}>
      <div className={styles.paperCard}>
        <div className={styles.paperTop}><span><Pencil size={16} /> {progress.letterCase === "uppercase" ? "Uppercase" : "Lowercase"} {progress.letterCase === "uppercase" ? lesson.letter : lesson.letter.toLowerCase()}</span><button type="button" className={styles.watchButton} disabled={saving || complete} aria-label={demonstrating ? "Stop letter demo" : "Watch letter demo"} onClick={() => demonstrating ? stopDemo() : startDemo()}>{demonstrating ? <Square size={15} /> : <Play size={15} fill="currentColor" />}{demonstrating ? "Stop" : "Show me"}</button></div>
        <p className={styles.paperPrompt}>{complete ? "You grew a lovely little letter!" : demonstrating ? "Watch the little pencil, then have a go." : activeStroke?.instruction}</p>
        <svg ref={board} className={styles.paper} viewBox="0 0 360 400" role="application" aria-label={`Trace ${progress.letterCase} ${lesson.letter}`} aria-describedby="letter-garden-keyboard-help" tabIndex={0}
          onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
          onPointerCancel={event => { if (input.current?.id === event.pointerId) lift(true); }} onLostPointerCapture={event => { if (input.current?.id === event.pointerId) lift(true); }} onKeyDown={keyboard}>
          <defs><pattern id="letter-paper-dots" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r=".7" fill="#e2eadd" /></pattern></defs>
          <rect width="360" height="400" fill="url(#letter-paper-dots)" />
          {[75, 160, 310, 375].map(y => <line key={y} x1="20" x2="340" y1={y} y2={y} stroke={y === 310 ? "#b5cfcc" : "#d6e4e0"} strokeWidth={y === 310 ? 1.5 : 1} strokeDasharray={y === 160 ? "6 7" : undefined} />)}
          {strokes.map((stroke, index) => {
            const filled = index < position.stroke ? stroke.points : index === position.stroke ? stroke.points.slice(0, position.point + 1) : [];
            const show = demo && index <= demo.stroke ? index < demo.stroke ? stroke.points : stroke.points.slice(0, Math.max(1, Math.ceil(demo.fraction * stroke.points.length))) : [];
            if (stroke.points.length === 1) return <g key={index}>
              {progress.guided && <circle cx={stroke.points[0].x} cy={stroke.points[0].y} r="11" fill="#e5deed" />}
              {filled.length > 0 && index < position.stroke && <circle cx={stroke.points[0].x} cy={stroke.points[0].y} r="11" fill="#6caa96" />}
              {show.length > 0 && <circle cx={stroke.points[0].x} cy={stroke.points[0].y} r="11" fill="#af8ccc" />}
            </g>;
            return <g key={index}>
              {progress.guided && <><path d={strokePath(stroke.points)} className={styles.trailBase} /><path d={strokePath(stroke.points)} className={styles.trailDots} /></>}
              {filled.length > 1 && <path d={strokePath(filled)} className={styles.ink} />}
              {show.length > 1 && <path d={strokePath(show)} className={styles.demoInk} />}
            </g>;
          })}
          {!complete && activePoint && !demonstrating && <g className={styles.startDot} transform={`translate(${activePoint.x} ${activePoint.y})`} aria-hidden="true"><circle r="19" fill="#f4c36a" opacity=".25" /><circle r="12" fill="#d6a34b" stroke="white" strokeWidth="2" /><text y="4" textAnchor="middle" fill="white" fontSize="12" fontWeight="900">{position.stroke + 1}</text></g>}
          {demoPoint && <g transform={`translate(${demoPoint.x} ${demoPoint.y})`} aria-hidden="true"><circle r="16" fill="#f8d783" stroke="white" strokeWidth="3" /><text y="6" textAnchor="middle" fontSize="23" fill="#86694c">✎</text></g>}
          {cursor && <circle cx={cursor.x} cy={cursor.y} r="9" fill="#668f81" stroke="white" strokeWidth="3" opacity=".85" />}
          {complete && <g aria-hidden="true"><text x="35" y="48" fontSize="25" fill="#edc66d">✦</text><text x="306" y="350" fontSize="33" fill="#b39bd0">✧</text></g>}
        </svg>
        <div className={styles.paperBottom}><span className={styles.strokeDots} aria-label={`${Math.min(position.stroke, strokes.length)} of ${strokes.length} strokes complete`}>{strokes.map((_, index) => <i key={index} className={index < position.stroke ? styles.dotDone : index === position.stroke ? styles.dotCurrent : ""}>{index < position.stroke ? <Check size={13} /> : index + 1}</i>)}</span><span>{progress.guided ? "Follow the dotted trail" : "Your own little trail"}</span></div>
      </div>

      <aside className={styles.lessonCard} aria-label="Letter lesson">
        <div className={styles.picture} role="img" aria-label={lesson.word}>{lesson.letter === "X" ? <svg viewBox="0 0 160 120" aria-hidden="true">{["#e77d83", "#e9a663", "#edce70", "#8bbb91", "#78bcb7", "#80a8d2", "#a58ec7"].map((color, index) => <rect key={color} x={15 + index * 18} y={12 + index * 4} width="15" height={80 - index * 6} rx="4" fill={color} />)}<path d="M25 111 110 67M128 112 62 61" stroke="#9b8265" strokeWidth="5" strokeLinecap="round" /><circle cx="110" cy="67" r="9" fill="#f1c571" /><circle cx="62" cy="61" r="9" fill="#b9a1d0" /></svg> : lesson.emoji}</div>
        <div className={styles.wordLabel}><strong>{progress.letterCase === "uppercase" ? lesson.letter : lesson.letter.toLowerCase()}</strong><span>{lesson.word}</span></div>
        <div className={styles.casePicker} role="group" aria-label="Letter case"><button type="button" aria-pressed={progress.letterCase === "uppercase"} disabled={saving} onClick={() => choose(lesson.letter, "uppercase")}><b>ABC</b> Uppercase</button><button type="button" aria-pressed={progress.letterCase === "lowercase"} disabled={saving} onClick={() => choose(lesson.letter, "lowercase")}><b>abc</b> Lowercase</button></div>
        <p className={styles.message} role="status" aria-live="polite">{message}</p>
        <div className={styles.lessonActions}>
          {complete ? <button type="button" className={styles.primaryButton} onClick={() => choose(LETTER_LESSONS[(LETTER_LESSONS.indexOf(lesson) + 1) % LETTER_LESSONS.length].letter)}><Sparkles size={18} /> Next letter</button> : <button type="button" className={styles.primaryButton} disabled={saving} onClick={() => demonstrating ? stopDemo() : startDemo()}>{demonstrating ? <Square size={16} /> : <Play size={18} fill="currentColor" />}{demonstrating ? "Stop showing me" : "Show me how"}</button>}
          <div className={styles.secondaryActions}><button type="button" disabled={muted || saving} onClick={() => { activate(); tell(`${letterExample(lesson)} ${activeStroke?.instruction ?? TRACING_LINES.complete}`); }}><Volume2 size={17} /> Hear the letter</button><button type="button" disabled={saving} onClick={reset}><RotateCcw size={17} /> Try again</button></div>
          <button type="button" className={styles.hintButton} aria-pressed={!progress.guided} disabled={saving || demonstrating} onClick={() => { activate(); setProgress(current => ({ ...current, guided: !current.guided })); tell(progress.guided ? TRACING_LINES.practice : TRACING_LINES.guided); }}>{progress.guided ? <EyeOff size={16} /> : <Eye size={16} />}{progress.guided ? "Try without the dotted trail" : "Bring back the dotted trail"}</button>
        </div>
        <label className={styles.voicePicker}>Story voice<select aria-label="Story voice" value={settings.voice} onChange={event => {
          const next = { ...settings, voice: event.target.value as MelodySoundSettings["voice"] }; setSettings(next);
          try { localStorage.setItem("melody-sound:v1", JSON.stringify(next)); } catch { /* Keep this visit's choice. */ }
        }}><option value="warm">Melody — bright & warm</option><option value="story">Storytime — soft & calm</option><option value="device">Device voice</option></select></label>
        <details className={styles.keyboardHelp}><summary>Keyboard help</summary><p id="letter-garden-keyboard-help">Focus the tracing paper. Press Enter to put the pencil down, use the arrow keys to move, then press Enter to lift it. Escape stops the pencil.</p></details>
        {saveError && <p className={styles.saveError} role="alert">{saveError} <button type="button" onClick={onExit}>Leave game</button></p>}
      </aside>
    </div>

    <section className={styles.alphabet} aria-label="Choose a letter"><div className={styles.alphabetHeading}><h2>Pick a little letter</h2><span><Flower2 size={16} /> {progress.completed.length} of 52 letters grown</span></div><div className={styles.letterGrid}>{LETTER_LESSONS.map(item => <button type="button" key={item.letter} disabled={saving} aria-label={`Practice ${progress.letterCase} ${item.letter}, ${item.word}`} aria-pressed={item.letter === lesson.letter} onClick={() => choose(item.letter)}><span>{progress.letterCase === "uppercase" ? item.letter : item.letter.toLowerCase()}</span>{progress.completed.includes(`${item.letter}:${progress.letterCase}`) && <Check size={12} className={styles.letterCheck} />}</button>)}</div></section>
    <footer className={styles.footer}><span><Flower2 size={13} /> Little letters grow with practice.</span><span>Character voices are AI-generated. Letter stamps save on this device.</span></footer>
  </section>;
}
