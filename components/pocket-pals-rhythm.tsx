"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./pocket-pals.module.css";

export function PocketPalsRhythm({ offsets, busy, onFinish }: {
  offsets: number[]; busy: boolean; onFinish: (taps: number[]) => Promise<boolean>;
}) {
  const [phase, setPhase] = useState<"idle" | "listen" | "tap" | "done">("idle");
  const [litBeat, setLitBeat] = useState(-1);
  const [tapCount, setTapCount] = useState(0);
  const [muted, setMuted] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const taps = useRef<number[]>([]);
  const firstTap = useRef(0);

  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    if (audio.current) void audio.current.close();
  }, []);

  function sound() {
    if (muted || !audio.current) return;
    const context = audio.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    gain.gain.setValueAtTime(0.12, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.13);
    oscillator.connect(gain); gain.connect(context.destination);
    oscillator.start(); oscillator.stop(context.currentTime + 0.14);
  }

  function listen() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    // Audio is optional: the same beats always flash visually.
    if (!muted) {
      try { audio.current ??= new AudioContext(); void audio.current.resume().catch(() => {}); } catch { /* Visual-only browser. */ }
    }
    taps.current = []; setTapCount(0); setPhase("listen"); setLitBeat(-1);
    offsets.forEach((offset, index) => {
      timers.current.push(setTimeout(() => {
        setLitBeat(index); sound();
        timers.current.push(setTimeout(() => setLitBeat(-1), 200));
      }, 500 + offset));
    });
    timers.current.push(setTimeout(() => { setLitBeat(-1); setPhase("tap"); }, 1200 + (offsets.at(-1) ?? 0)));
  }

  function tap() {
    if (phase !== "tap" || taps.current.length >= offsets.length) return;
    const now = performance.now();
    if (!taps.current.length) firstTap.current = now;
    taps.current.push(Math.round(now - firstTap.current));
    setTapCount(taps.current.length); sound();
    if (taps.current.length === offsets.length) setPhase("done");
  }

  return <div className={styles.rhythmPanel}>
    <h3>Rhythm Paws</h3>
    <p>{phase === "listen" ? "Listen and watch the paws flash…" : phase === "tap" ? "Your turn! Repeat the beat, including its pauses." : phase === "done" ? "Ready to check your rhythm!" : "Your pal has a beat for you. Listen, then tap it back."}</p>
    <div className={styles.rhythmBeats} aria-label={`${offsets.length} beats`}>
      {offsets.map((offset, index) => <span key={offset} className={litBeat === index || index < tapCount ? styles.beatLit : ""}>🐾</span>)}
    </div>
    <button className={styles.rhythmPad} disabled={busy || phase !== "tap"} onClick={tap} aria-label="Tap rhythm">🐾<span>Tap the beat</span></button>
    <div className={styles.playButtons}>
      <button disabled={busy || phase === "listen"} onClick={listen}>{phase === "idle" ? "Listen to the beat" : "Listen again"}</button>
      <button className={styles.primary} disabled={busy || phase !== "done"} onClick={async () => { await onFinish([...taps.current]); }}>Check rhythm</button>
    </div>
    <label className={styles.rhythmMute}><input type="checkbox" checked={muted} disabled={phase === "listen"} onChange={(event) => setMuted(event.target.checked)} /> Quiet play (visual beats)</label>
    <small>8 coins for your first three play wins each day. Listen again to retry.</small>
  </div>;
}

export function PocketPalBubble({ index, caught, disabled, onCatch }: {
  index: number; caught: boolean; disabled: boolean; onCatch: () => void;
}) {
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (!caught) return;
    const timer = setTimeout(() => setGone(true), 240);
    return () => clearTimeout(timer);
  }, [caught]);
  if (gone) return null;
  return <button className={`${styles.catchBubble} ${caught ? styles.popBubble : ""}`} disabled={disabled || caught}
    onClick={onCatch} style={{ left: `${12 + (index * 29) % 72}%`, top: `${19 + (index * 31) % 52}%` }}
    aria-label={`Catch bubble ${index + 1}`}><span aria-hidden="true">{caught ? "✧" : ""}</span></button>;
}
