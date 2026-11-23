"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { narrationId, narrationParts, type MelodySoundSettings } from "@/lib/melody-sound";
import voiceManifest from "@/lib/melody-voice-manifest.json";

const voiceClips = { warm: new Set(voiceManifest.voices.warm as string[]), story: new Set(voiceManifest.voices.story as string[]) };

export function useMelodyAudio(muted: boolean, settings: MelodySoundSettings) {
  const context = useRef<AudioContext | null>(null);
  const current = useRef({ muted, settings });
  current.current = { muted, settings };
  const speech = useRef<HTMLAudioElement | null>(null);
  const speechPlayer = useRef<HTMLAudioElement | null>(null);
  const speechGeneration = useRef(0);
  const cancelPlayback = useRef<(() => void) | null>(null);
  const effects = useRef(new Set<HTMLAudioElement>());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceFallback, setVoiceFallback] = useState(false);

  const activate = useCallback(() => {
    if (current.current.muted) return;
    // Unlock one reusable media element during the gesture for mobile browsers.
    if (!speechPlayer.current) {
      const player = new Audio("/games/melody/audio/unlock.wav");
      speechPlayer.current = player;
      player.muted = true;
      void player.play().then(() => {
        if (player.src.endsWith("/unlock.wav")) player.pause();
        player.muted = false;
      }).catch(() => { player.muted = false; });
    }
    try {
      if (!context.current || context.current.state === "closed") context.current = new AudioContext();
      if (context.current.state === "suspended") void context.current.resume().catch(() => {});
    } catch { /* Visual play remains available without audio support. */ }
  }, []);

  const stopSpeech = useCallback(() => {
    speechGeneration.current++;
    cancelPlayback.current?.();
    if (speech.current) { speech.current.pause(); speech.current = null; }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  }, []);

  const effect = useCallback((name: string) => {
    if (current.current.muted || current.current.settings.volume === 0) return () => {};
    const player = new Audio(`/games/melody/audio/${name}.wav`);
    player.volume = current.current.settings.volume * 0.65;
    effects.current.add(player);
    const release = () => { effects.current.delete(player); };
    player.onended = release;
    player.onerror = release;
    void player.play().catch(release);
    return () => { player.pause(); release(); };
  }, []);

  const stopEffects = useCallback(() => {
    effects.current.forEach(player => player.pause());
    effects.current.clear();
  }, []);

  const tone = useCallback((number: number, celebration = false) => {
    if (celebration) { effect("success"); return; }
    if (current.current.settings.keypad === "telephone") { effect(`key-${number}`); return; }
    activate();
    const audio = context.current;
    if (!audio || audio.state !== "running" || current.current.muted) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = [261.63, 293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33, 659.25][number];
    gain.gain.setValueAtTime(0, audio.currentTime);
    gain.gain.linearRampToValueAtTime(0.16 * current.current.settings.volume, audio.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.24);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + 0.26);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }, [activate, effect]);

  const deviceSpeak = useCallback((text: string): Promise<boolean> => {
    if (!("speechSynthesis" in window) || current.current.muted) return Promise.resolve(true);
    const preferences = current.current.settings;
    const available = window.speechSynthesis.getVoices();
    const voice = available.find(voice => voice.voiceURI === preferences.deviceVoice)
      ?? available.find(voice => voice.lang.startsWith("en") && /natural|premium|enhanced|Samantha|Aria|Jenny/i.test(voice.name))
      ?? available.find(voice => voice.lang.startsWith("en"));
    const utterance = new SpeechSynthesisUtterance(text);
    if (voice) utterance.voice = voice;
    utterance.lang = "en-US";
    utterance.rate = 0.9 * preferences.speed;
    utterance.pitch = 1;
    utterance.volume = preferences.volume;
    return new Promise(resolve => {
      let settled = false;
      const finish = (completed: boolean) => {
        if (settled) return;
        settled = true;
        utterance.onend = null; utterance.onerror = null;
        if (cancelPlayback.current === cancel) cancelPlayback.current = null;
        resolve(completed);
      };
      const cancel = () => finish(false);
      cancelPlayback.current = cancel;
      utterance.onend = () => finish(true);
      // Unavailable device speech still permits visual play; cancellation does not.
      utterance.onerror = () => finish(true);
      try { window.speechSynthesis.speak(utterance); } catch { finish(true); }
    });
  }, []);

  const speak = useCallback(async (text: string): Promise<boolean> => {
    stopSpeech();
    if (current.current.muted || current.current.settings.volume === 0) return true;
    const preferences = current.current.settings;
    const parts = narrationParts(text);
    if (preferences.voice === "device") { setVoiceFallback(false); return deviceSpeak(text); }
    const pack = preferences.voice;
    if (parts.some(part => !voiceClips[pack].has(narrationId(part)))) {
      setVoiceFallback(true); return deviceSpeak(text);
    }
    setVoiceFallback(false);
    const generation = speechGeneration.current;
    for (const part of parts) {
      if (generation !== speechGeneration.current || current.current.muted) return false;
      const player = speechPlayer.current ?? new Audio();
      speechPlayer.current = player;
      player.src = `/games/melody/voices/${pack}/${narrationId(part)}.mp3`;
      speech.current = player;
      player.volume = preferences.volume;
      player.playbackRate = preferences.speed;
      const result = await new Promise<"ended" | "failed" | "cancelled">((resolve) => {
        let settled = false;
        const finish = (result: "ended" | "failed" | "cancelled") => {
          if (settled) return;
          settled = true;
          player.onended = null; player.onerror = null;
          if (cancelPlayback.current === cancel) cancelPlayback.current = null;
          resolve(result);
        };
        const cancel = () => finish("cancelled");
        cancelPlayback.current = cancel;
        player.onended = () => finish("ended");
        player.onerror = () => finish("failed");
        void player.play().catch(() => finish("failed"));
      });
      if (result === "cancelled" || generation !== speechGeneration.current) return false;
      if (result === "failed") { speech.current = null; setVoiceFallback(true); return deviceSpeak(text); }
    }
    if (generation === speechGeneration.current) speech.current = null;
    return true;
  }, [deviceSpeak, stopSpeech]);

  const stop = useCallback(() => {
    stopSpeech(); stopEffects();
    speechPlayer.current?.pause();
    if (context.current?.state === "running") void context.current.suspend().catch(() => {});
  }, [stopSpeech, stopEffects]);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const load = () => setVoices(window.speechSynthesis.getVoices().filter(voice => voice.lang.startsWith("en")));
    load();
    window.speechSynthesis.addEventListener?.("voiceschanged", load);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", load);
  }, []);
  useEffect(() => { stop(); }, [muted, settings.voice, settings.deviceVoice, settings.speed, settings.volume, stop]);
  useEffect(() => () => {
    stop();
    if (context.current && context.current.state !== "closed") void context.current.close().catch(() => {});
  }, [stop]);

  return { activate, tone, speak, stop, stopSpeech, effect, stopEffects, voices, voiceFallback };
}
