"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { FARM_AUDIO, type FarmSound } from "@/lib/sunny-farm-feedback";

export function useFarmAudio() {
  const [effects, setEffects] = useState(false);
  const [narration, setNarration] = useState(false);
  const [volume, setVolume] = useState(.35);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState("");
  const context = useRef<AudioContext | null>(null);
  const buffers = useRef(new Map<string, Promise<AudioBuffer>>());
  const source = useRef<AudioBufferSourceNode | null>(null);
  const gain = useRef<GainNode | null>(null);
  const settings = useRef({ effects, narration, volume, voiceURI }); settings.current = { effects, narration, volume, voiceURI };
  const generation = useRef(0);
  const last = useRef({ sound: 0, spoken: "", speech: 0 });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const update = () => {
      const available = window.speechSynthesis?.getVoices().filter(v => /^en[-_]/i.test(v.lang)) ?? [];
      available.sort((a, b) => Number(/natural|neural|premium|enhanced|Google|Samantha|Aria|Jenny|Karen|Serena/i.test(b.name)) - Number(/natural|neural|premium|enhanced|Google|Samantha|Aria|Jenny|Karen|Serena/i.test(a.name)));
      setVoices(available);
    };
    update(); window.speechSynthesis?.addEventListener("voiceschanged", update);
    return () => { mounted.current = false; generation.current++; source.current?.stop(); window.speechSynthesis?.cancel(); window.speechSynthesis?.removeEventListener("voiceschanged", update); void context.current?.close(); context.current = null; buffers.current.clear(); };
  }, []);
  useEffect(() => { if (gain.current && context.current) gain.current.gain.setTargetAtTime(volume * .6, context.current.currentTime, .03); }, [volume]);
  useEffect(() => { if (!narration) window.speechSynthesis?.cancel(); }, [narration]);
  const unlock = useCallback(() => {
    const AudioCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return null;
    if (!context.current) {
      context.current = new AudioCtor();
      gain.current = context.current.createGain(); gain.current.gain.value = settings.current.volume * .6; gain.current.connect(context.current.destination);
    }
    void context.current.resume().catch(() => {});
    return context.current;
  }, []);
  function buffer(id: FarmSound, ctx: AudioContext) {
    const path = `/games/sunny-farm/audio/${FARM_AUDIO[id]}`;
    if (!buffers.current.has(path)) buffers.current.set(path, fetch(path).then(r => { if (!r.ok) throw new Error("Audio unavailable"); return r.arrayBuffer(); }).then(bytes => ctx.decodeAudioData(bytes)).catch(error => { buffers.current.delete(path); throw error; }));
    return buffers.current.get(path)!;
  }
  const play = useCallback((id: FarmSound) => {
    if (!settings.current.effects || Date.now() - last.current.sound < 250) return;
    const ctx = unlock(); if (!ctx) return;
    last.current.sound = Date.now(); const request = ++generation.current;
    void buffer(id, ctx).then(clip => {
      if (!mounted.current || !settings.current.effects || request !== generation.current || ctx.state === "closed") return;
      source.current?.stop(); const node = ctx.createBufferSource(); node.buffer = clip; node.connect(gain.current!); source.current = node;
      node.onended = () => { node.disconnect(); if (source.current === node) source.current = null; };
      node.start();
    }).catch(() => {});
  }, [unlock]);
  function toggleEffects() {
    const enabled = !effects; settings.current.effects = enabled; setEffects(enabled);
    if (enabled) { const ctx = unlock(); if (ctx) for (const key of Object.keys(FARM_AUDIO) as FarmSound[]) void buffer(key, ctx).catch(() => {}); }
    else { generation.current++; source.current?.stop(); source.current = null; }
  }
  function say(text: string, explicit = false) {
    if (!settings.current.narration || !window.speechSynthesis || !text) return;
    const now = Date.now();
    if (!explicit && ((text === last.current.spoken && now - last.current.speech < 15_000) || now - last.current.speech < 2500 || window.speechSynthesis.speaking)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(text);
    speech.voice = voices.find(v => v.voiceURI === settings.current.voiceURI) ?? voices[0] ?? null;
    speech.rate = 1; speech.pitch = 1.04; speech.volume = settings.current.volume;
    last.current.spoken = text; last.current.speech = now;
    window.speechSynthesis.speak(speech);
  }
  return { effects, toggleEffects, narration, setNarration, volume, setVolume, voices, voiceURI, setVoiceURI, play, say };
}
