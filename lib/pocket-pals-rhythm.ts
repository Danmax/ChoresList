export const RHYTHM_SOUNDS = [
  { id: "drums", name: "Soft drums", emoji: "🥁" },
  { id: "woodblocks", name: "Woodblocks", emoji: "🪵" },
  { id: "bells", name: "Bells", emoji: "🔔" },
  { id: "space", name: "Space notes", emoji: "🚀" },
] as const;
export type RhythmSound = typeof RHYTHM_SOUNDS[number]["id"];
export type RhythmPreferences = { sound: RhythmSound; volume: number; muted: boolean };

// Gaps are beat multiples; half beats are reserved for older learners.
export const RHYTHM_PATTERNS = [
  { id: "tiny-march", name: "Tiny march", band: "little", gaps: [1, 1], beat: 800 },
  { id: "peekaboo", name: "Peekaboo paws", band: "little", gaps: [1, 2], beat: 800 },
  { id: "sleepy-hop", name: "Sleepy hop", band: "little", gaps: [2, 1], beat: 800 },
  { id: "four-paws", name: "Four little paws", band: "little", gaps: [1, 1, 1], beat: 850 },
  { id: "gentle-train", name: "Gentle train", band: "little", gaps: [1, 2, 1], beat: 800 },
  { id: "cloud-steps", name: "Cloud steps", band: "little", gaps: [2, 1, 2], beat: 800 },
  { id: "happy-march", name: "Happy march", band: "junior", gaps: [1, 1, 1], beat: 600 },
  { id: "bunny-hop", name: "Bunny hop", band: "junior", gaps: [1, 2, 1], beat: 600 },
  { id: "tiptoe", name: "Tiptoe trail", band: "junior", gaps: [2, 1, 1], beat: 650 },
  { id: "rain-dance", name: "Rain dance", band: "junior", gaps: [1, 1, 2, 1], beat: 600 },
  { id: "train-ride", name: "Train ride", band: "junior", gaps: [1, 2, 1, 2], beat: 550 },
  { id: "star-step", name: "Star steps", band: "junior", gaps: [2, 1, 2, 1], beat: 600 },
  { id: "paw-parade", name: "Paw parade", band: "older", gaps: [1, 1, 2, 1], beat: 480 },
  { id: "moon-bounce", name: "Moon bounce", band: "older", gaps: [.5, .5, 2, 1], beat: 600 },
  { id: "jungle-jam", name: "Jungle jam", band: "older", gaps: [1, .5, .5, 2, 1], beat: 600 },
  { id: "starlight", name: "Starlight shuffle", band: "older", gaps: [1.5, .5, 1.5, .5, 1], beat: 600 },
  { id: "puddle-jump", name: "Puddle jump", band: "older", gaps: [.5, 1.5, 1, .5, 1.5], beat: 600 },
  { id: "festival", name: "Paw festival", band: "older", gaps: [1, .5, .5, 2, .5, 1.5], beat: 600 },
] as const;

export function createRhythmPattern(age: number, seed: number, previous?: string) {
  const band = age < 6 ? "little" : age < 10 ? "junior" : "older";
  const available = RHYTHM_PATTERNS.filter((pattern) => pattern.band === band && pattern.id !== previous);
  const pattern = available[Math.abs(Math.trunc(seed)) % available.length];
  const offsets = [0];
  for (const gap of pattern.gaps) offsets.push(offsets.at(-1)! + Math.round(gap * pattern.beat));
  return { id: pattern.id, name: pattern.name, offsets, tolerance: age < 6 ? 400 : 250 };
}

// Original synthesized sounds: no downloads, samples, or autoplay. Both listen
// and tap use the same voice/note index. Nodes disconnect when their note ends.
export function playRhythmTone(context: BaseAudioContext, sound: RhythmSound, index: number, volume: number, when = context.currentTime) {
  const notes = [523.25, 659.25, 783.99, 659.25];
  const pitch = notes[index % notes.length];
  const voices: { type: OscillatorType; frequency: number; end: number; duration: number; gain: number }[] = sound === "drums"
    ? [{ type: "sine", frequency: index % 2 ? 150 : 180, end: 55, duration: .18, gain: .24 }]
    : sound === "woodblocks"
      ? [{ type: "triangle", frequency: 760 + index % 2 * 240, end: 620, duration: .08, gain: .12 }, { type: "sine", frequency: 1520, end: 1200, duration: .055, gain: .04 }]
      : sound === "bells"
        ? [{ type: "sine", frequency: pitch, end: pitch, duration: .22, gain: .12 }, { type: "sine", frequency: pitch * 2, end: pitch * 2, duration: .15, gain: .035 }]
        : [{ type: "triangle", frequency: pitch / 2, end: pitch, duration: .16, gain: .12 }, { type: "sine", frequency: pitch, end: pitch * 1.5, duration: .12, gain: .035 }];
  const level = Number.isFinite(volume) ? Math.max(0, Math.min(1, volume)) : 0;
  if (level === 0) return;
  for (const voice of voices) {
    const oscillator = context.createOscillator(), envelope = context.createGain();
    oscillator.type = voice.type;
    oscillator.frequency.setValueAtTime(voice.frequency, when);
    oscillator.frequency.exponentialRampToValueAtTime(voice.end, when + voice.duration);
    envelope.gain.setValueAtTime(.0001, when);
    envelope.gain.linearRampToValueAtTime(Math.max(.0001, voice.gain * level), when + .005);
    envelope.gain.exponentialRampToValueAtTime(.0001, when + voice.duration);
    oscillator.connect(envelope); envelope.connect(context.destination);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    oscillator.start(when); oscillator.stop(when + voice.duration + .01);
  }
}
