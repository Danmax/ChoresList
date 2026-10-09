"use client";

import { useEffect, useRef, useState } from "react";
import { playRhythmTone, RHYTHM_SOUNDS, type RhythmPreferences } from "@/lib/pocket-pals-rhythm";
import styles from "./pocket-pals.module.css";

export function PocketPalsRhythm({ offsets, patternName, preferences, onPreferencesChange, busy, onFinish, onNewPattern }: {
  offsets: number[]; patternName: string; preferences: RhythmPreferences; onPreferencesChange: (preferences: RhythmPreferences) => void;
  busy: boolean; onFinish: (taps: number[]) => Promise<boolean>; onNewPattern: () => Promise<boolean>;
}) {
  const [phase, setPhase] = useState<"idle" | "listen" | "tap" | "done">("idle");
  const [litBeat, setLitBeat] = useState(-1);
  const [tapCount, setTapCount] = useState(0);
  const { sound: voice, volume, muted } = preferences;
  const [audioUnavailable, setAudioUnavailable] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const audio = useRef<AudioContext | null>(null);
  const taps = useRef<number[]>([]);
  const firstTap = useRef(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      timers.current.forEach(clearTimeout);
      if (audio.current) void audio.current.close().catch(() => {});
      audio.current = null;
    };
  }, []);

  async function prepareAudio() {
    try {
      audio.current ??= new AudioContext();
      await audio.current.resume();
      if (mounted.current) setAudioUnavailable(false);
      return true;
    } catch {
      if (mounted.current) setAudioUnavailable(true);
      return false;
    }
  }

  function sound(index: number) {
    if (muted || !audio.current) return;
    try { playRhythmTone(audio.current, voice, index, volume / 100); }
    catch { setAudioUnavailable(true); /* Visual beats still work. */ }
  }

  function listen() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    // Audio is optional: the same beats always flash visually.
    if (!muted) void prepareAudio();
    taps.current = []; setTapCount(0); setPhase("listen"); setLitBeat(-1);
    offsets.forEach((offset, index) => {
      timers.current.push(setTimeout(() => {
        setLitBeat(index); sound(index);
        timers.current.push(setTimeout(() => setLitBeat(-1), 200));
      }, 500 + offset));
    });
    timers.current.push(setTimeout(() => { setLitBeat(-1); setPhase("tap"); }, 1200 + (offsets.at(-1) ?? 0)));
  }

  function tap() {
    if (phase !== "tap" || taps.current.length >= offsets.length) return;
    const now = performance.now();
    if (!taps.current.length) firstTap.current = now;
    sound(taps.current.length);
    taps.current.push(Math.round(now - firstTap.current));
    setTapCount(taps.current.length);
    if (taps.current.length === offsets.length) setPhase("done");
  }

  return <div className={styles.rhythmPanel}>
    <h3>Rhythm Paws</h3>
    <div className={styles.rhythmPattern}><strong>{patternName}</strong><span>{offsets.length} beats</span></div>
    <p>{phase === "listen" ? "Listen and watch the paws flash…" : phase === "tap" ? "Your turn! Repeat the beat, including its pauses." : phase === "done" ? "Ready to check your rhythm!" : "Your pal has a beat for you. Listen, then tap it back."}</p>
    <fieldset className={styles.rhythmSounds} disabled={phase === "listen" || phase === "tap"}>
      <legend>Choose your sound</legend>
      <div>{RHYTHM_SOUNDS.map((option) => <button key={option.id} type="button" aria-pressed={voice === option.id} onClick={() => onPreferencesChange({ ...preferences, sound: option.id })}><span aria-hidden="true">{option.emoji}</span>{option.name}</button>)}</div>
    </fieldset>
    <div className={styles.rhythmAudioControls}><label>Sound volume<input type="range" min="0" max="100" step="5" value={volume} disabled={phase === "listen"} onChange={(event) => onPreferencesChange({ ...preferences, volume: Number(event.target.value) })} /></label><button type="button" disabled={muted || phase === "listen" || phase === "tap"} onClick={async () => { if (await prepareAudio() && mounted.current) sound(0); }}>Preview sound</button></div>
    <div className={styles.rhythmBeats} aria-label={`${offsets.length} beats`}>
      {offsets.map((offset, index) => <span key={offset} className={litBeat === index || index < tapCount ? styles.beatLit : ""}>🐾</span>)}
    </div>
    <button className={styles.rhythmPad} disabled={busy || phase !== "tap"} onClick={tap} aria-label="Tap rhythm">🐾<span>Tap the beat</span></button>
    <div className={styles.playButtons}>
      <button disabled={busy || phase === "listen"} onClick={listen}>{phase === "idle" ? "Listen to the beat" : "Listen again"}</button>
      <button className={styles.primary} disabled={busy || phase !== "done"} onClick={async () => { await onFinish([...taps.current]); }}>Check rhythm</button>
    </div>
    <button className={styles.rhythmNewPattern} type="button" disabled={busy || phase === "listen"} onClick={() => void onNewPattern()}>New pattern</button>
    <label className={styles.rhythmMute}><input type="checkbox" checked={muted} disabled={phase === "listen"} onChange={(event) => { onPreferencesChange({ ...preferences, muted: event.target.checked }); if (!event.target.checked) void prepareAudio(); }} /> Quiet play (visual beats)</label>
    {audioUnavailable && !muted && <p role="status">Sound isn&apos;t available here. Follow the flashing paws instead.</p>}
    <small>8 coins for your first three play wins each day. Listen again repeats this beat; New pattern picks a different one.</small>
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
