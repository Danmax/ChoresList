import { createMelodyState, melodyReducer, NUMBER_NAMES, type MelodyMode } from "./melody-phone";
import { FAMILY_STORIES, MELODY_LINES } from "./melody-pretend";
import { FAMILY_ADVENTURES } from "./melody-family-library";
import { CALL_INTROS, COUNT_PROMPTS, DIALOGUE_LIBRARY, DISCOVERY_OBJECTS, FIND_PROMPTS } from "./melody-content";

export type MelodySoundSettings = {
  voice: "warm" | "story" | "device";
  deviceVoice: string;
  speed: number;
  ringtone: "classic" | "bouncy" | "sparkle";
  keypad: "musical" | "telephone";
  volume: number;
};
export const DEFAULT_MELODY_SOUND: MelodySoundSettings = {
  voice: "warm", deviceVoice: "", speed: 1, ringtone: "classic", keypad: "telephone", volume: 0.7,
};

export function readMelodySound(value: unknown): MelodySoundSettings {
  const source = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const clamp = (key: string, min: number, max: number, fallback: number) => typeof source[key] === "number" && Number.isFinite(source[key]) ? Math.max(min, Math.min(max, source[key] as number)) : fallback;
  return {
    voice: source.voice === "story" || source.voice === "device" ? source.voice : "warm",
    deviceVoice: typeof source.deviceVoice === "string" ? source.deviceVoice.slice(0, 300) : "",
    speed: clamp("speed", 0.75, 1.2, 1),
    ringtone: source.ringtone === "bouncy" || source.ringtone === "sparkle" ? source.ringtone : "classic",
    keypad: source.keypad === "musical" ? "musical" : "telephone",
    volume: clamp("volume", 0, 1, 0.7),
  };
}

export function narrationParts(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map(part => part.trim()).filter(Boolean);
}

export function narrationId(text: string): string {
  let hash = 2166136261;
  const normalized = text.toLowerCase().replace(/\s+/g, " ").trim();
  for (let index = 0; index < normalized.length; index++) hash = Math.imul(hash ^ normalized.charCodeAt(index), 16777619);
  return (hash >>> 0).toString(16).padStart(8, "0");
}

/** Finite game narration can be generated once instead of charging for live play. */
export function melodyNarrationCatalog(): Map<string, string> {
  const lines = new Map<string, string>();
  const add = (text: string) => narrationParts(text).forEach(part => lines.set(narrationId(part), part));
  add(createMelodyState().message);
  Object.values(MELODY_LINES).forEach(add);
  Object.values(FAMILY_STORIES).forEach(story => story.nodes.forEach(node => add(node.text)));
  Object.values(FAMILY_ADVENTURES).forEach(adventures => adventures.forEach(story => story.nodes.forEach(node => add(node.text))));
  Object.values(DIALOGUE_LIBRARY).forEach(lines => lines.forEach(add));
  Object.values(CALL_INTROS).forEach(lines => lines.forEach(add));
  DISCOVERY_OBJECTS.forEach(object => {
    add(object.fact);
    add(`There are no ${object.plural}! Which number means none?`);
    COUNT_PROMPTS.forEach(prompt => add(prompt(object)));
  });
  NUMBER_NAMES.forEach(name => FIND_PROMPTS.forEach(prompt => add(prompt(name))));
  NUMBER_NAMES.forEach(name => add(`${name}!`));
  for (let completed = 0; completed < 22; completed++) {
    const initial = { ...createMelodyState(), completed };
    for (const mode of ["explore", "find", "count"] as MelodyMode[]) {
      const state = melodyReducer(initial, { type: "mode", mode });
      add(state.message);
      for (let number = 0; number < 10; number++) add(melodyReducer(state, { type: "number", number }).message);
      const calling = melodyReducer(state, { type: "call" });
      add(calling.message);
      add(melodyReducer(calling, { type: "hang-up" }).message);
      let counting = state;
      for (let index = 0; index < (state.question?.target ?? 0); index++) {
        counting = melodyReducer(counting, { type: "count-object", index });
        add(counting.message);
      }
    }
  }
  const started = melodyReducer(createMelodyState(), { type: "start" });
  add(melodyReducer(started, { type: "incoming" }).message);
  add(melodyReducer(melodyReducer(started, { type: "incoming" }), { type: "dismiss" }).message);
  add(melodyReducer(started, { type: "sleep" }).message);
  return lines;
}
