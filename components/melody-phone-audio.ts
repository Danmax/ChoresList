"use client";

import { useCallback, useEffect, useRef } from "react";

/** Browser speech and synthesized tones, with no microphone or recordings. */
export function useMelodyAudio(muted: boolean) {
  const context = useRef<AudioContext | null>(null);
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const activate = useCallback(() => {
    if (mutedRef.current) return;
    try {
      context.current ??= new AudioContext();
      if (context.current.state === "suspended") void context.current.resume().catch(() => {});
    } catch { /* Visual play also works when browser audio is unavailable. */ }
  }, []);

  const tone = useCallback((number: number, celebration = false) => {
    activate();
    const audio = context.current;
    if (!audio || audio.state !== "running" || mutedRef.current) return;
    const notes = celebration ? [523.25, 659.25, 783.99, 1046.5] : [[261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25][number]];
    notes.forEach((frequency, index) => {
      const start = audio.currentTime + index * 0.12;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.12, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.24);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.26);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }, [activate]);

  const speak = useCallback((text: string) => {
    if (mutedRef.current || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(voice => voice.lang === "en-US" && /Samantha|Karen|Aria|Jenny/i.test(voice.name))
      ?? voices.find(voice => voice.lang.startsWith("en"));
    if (voice) utterance.voice = voice;
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    utterance.pitch = 1.15;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stop = useCallback(() => {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    if (context.current?.state === "running") void context.current.suspend().catch(() => {});
  }, []);

  useEffect(() => { if (muted) stop(); }, [muted, stop]);
  useEffect(() => () => {
    stop();
    if (context.current && context.current.state !== "closed") void context.current.close().catch(() => {});
  }, [stop]);

  return { activate, tone, speak, stop };
}
