import { FAMILY_STORIES, MELODY_LINES, type FamilyStoryId, type PretendContact } from "./melody-pretend";
import { familyAdventure } from "./melody-family-library";
import { CALL_INTROS, COUNT_PROMPTS, DIALOGUE_LIBRARY, DISCOVERY_OBJECTS, DISCOVERY_TOPICS, FIND_PROMPTS, dialogueLine, discoveryObject, type DialogueCursors, type DialogueKind, type DiscoveryFilter, type DiscoveryObject } from "./melody-content";
import { TELEPHONE_LEVELS, telephoneAnswer, telephoneSequence, type TelephoneDifficulty } from "./melody-telephone";

export type MelodyMode = "explore" | "find" | "count" | "family" | "telephone";
export type MelodyPhase = "welcome" | "playing" | "ringing" | "dialing" | "listening" | "celebrating" | "sleeping";
export const NUMBER_NAMES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

export type MelodyQuestion = {
  kind: "find" | "count";
  target: number;
  object: DiscoveryObject;
  prompt: string;
};

export type MelodyState = {
  mode: MelodyMode;
  phase: MelodyPhase;
  question: MelodyQuestion | null;
  selected: number | null;
  counted: number[];
  completed: number;
  discoveries: number[];
  hint: boolean;
  message: string;
  revision: number;
  returnMode: MelodyMode | null;
  calls: number;
  familyContactId: string | null;
  familyStory: FamilyStoryId;
  familyDigits: number[];
  familyStep: number;
  familyConnected: boolean;
  telephoneRound: number;
  sequence: number[];
  echoed: number[];
  sequenceHeard: boolean;
  contentTurn: number;
  lastObjectId?: string;
  exploreObject: DiscoveryObject | null;
  topic: DiscoveryFilter;
  lineCursors: DialogueCursors;
  familyVisits: Partial<Record<FamilyStoryId, number>>;
  familyAdventure: number;
  telephoneDifficulty: TelephoneDifficulty;
  sessionSeed: number;
};

export type MelodyProgress = Pick<MelodyState, "contentTurn" | "lastObjectId" | "topic" | "lineCursors" | "familyVisits" | "telephoneDifficulty" | "telephoneRound" | "sessionSeed">;

export function readMelodyProgress(value: unknown, defaultDifficulty: TelephoneDifficulty = "gentle"): MelodyProgress {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? Math.min(100_000_000, Math.max(0, Math.floor(value))) : 0;
  const lineCursors: DialogueCursors = {};
  const familyVisits: Partial<Record<FamilyStoryId, number>> = {};
  if (raw.lineCursors && typeof raw.lineCursors === "object") for (const key of Object.keys(DIALOGUE_LIBRARY) as DialogueKind[]) lineCursors[key] = count((raw.lineCursors as Record<string, unknown>)[key]);
  if (raw.familyVisits && typeof raw.familyVisits === "object") for (const key of Object.keys(FAMILY_STORIES) as FamilyStoryId[]) familyVisits[key] = count((raw.familyVisits as Record<string, unknown>)[key]);
  return {
    contentTurn: count(raw.contentTurn), sessionSeed: count(raw.sessionSeed), telephoneRound: count(raw.telephoneRound), lineCursors, familyVisits,
    telephoneDifficulty: typeof raw.telephoneDifficulty === "string" && Object.hasOwn(TELEPHONE_LEVELS, raw.telephoneDifficulty) ? raw.telephoneDifficulty as TelephoneDifficulty : defaultDifficulty,
    topic: DISCOVERY_TOPICS.some(topic => topic.id === raw.topic) ? raw.topic as DiscoveryFilter : "all",
    lastObjectId: DISCOVERY_OBJECTS.some(object => object.id === raw.lastObjectId) ? raw.lastObjectId as string : undefined,
  };
}

type MelodyBaseAction =
  | { type: "start" }
  | { type: "mode"; mode: MelodyMode }
  | { type: "number"; number: number }
  | { type: "count-object"; index: number }
  | { type: "next" }
  | { type: "incoming"; requested?: boolean }
  | { type: "call" }
  | { type: "dismiss" }
  | { type: "hang-up" }
  | { type: "sleep" }
  | { type: "wake" };
export type MelodyExtendedAction =
  | { type: "select-contact"; contact: PretendContact }
  | { type: "dial-family"; contact: PretendContact | undefined }
  | { type: "connect-family" }
  | { type: "incoming-family"; contact: PretendContact }
  | { type: "family-choice"; next: number }
  | { type: "erase" }
  | { type: "listen" }
  | { type: "sequence-ready" };
export type MelodyAction = MelodyBaseAction | MelodyExtendedAction
  | { type: "restore"; progress: unknown }
  | { type: "topic"; topic: DiscoveryFilter }
  | { type: "difficulty"; difficulty: TelephoneDifficulty };

export function melodyQuestion(mode: "find" | "count", completed: number, call = false, contentTurn = completed, topic: DiscoveryFilter = "all", previousId?: string): MelodyQuestion {
  // Every child starts with 1–3, then 1–5. Later questions include every digit,
  // including zero, while the complete keypad always remains available.
  const sequence = completed < 6 ? [2, 3, 1, 3, 2, 1] : completed < 12 ? [4, 2, 5, 3, 1, 5] : [0, 6, 7, 8, 9, 3, 5, 2, 4, 1];
  const offset = completed < 6 ? completed : completed < 12 ? completed - 6 : completed - 12;
  const target = sequence[offset % sequence.length];
  const object = discoveryObject(contentTurn, topic, previousId);
  const prompt = mode === "find"
    ? FIND_PROMPTS[(completed + contentTurn) % FIND_PROMPTS.length](NUMBER_NAMES[target])
    : target === 0
      ? `There are no ${object.plural}! Which number means none?`
      : `${COUNT_PROMPTS[Math.floor(contentTurn / DISCOVERY_OBJECTS.length) % COUNT_PROMPTS.length](object)} Tap each one to count, then press the number.`;
  const introduction = call ? CALL_INTROS[object.topic][Math.floor(contentTurn / DISCOVERY_OBJECTS.length) % 3] + " " : "";
  return { kind: mode, target, object, prompt: introduction + prompt };
}

export function createMelodyState(progress?: Partial<MelodyProgress>): MelodyState {
  const saved = readMelodyProgress(progress);
  return {
    ...saved,
    mode: "explore", phase: "welcome", question: null, selected: null,
    counted: [], completed: 0, discoveries: [], hint: false,
    message: dialogueLine("welcome", saved.lineCursors.welcome), revision: 0,
    returnMode: null, calls: 0,
    familyContactId: null, familyStory: "garden", familyDigits: [], familyStep: 0, familyConnected: false,
    sequence: [], echoed: [], sequenceHeard: false, exploreObject: null, familyAdventure: 0,
    lineCursors: { ...saved.lineCursors, welcome: (saved.lineCursors.welcome ?? 0) + 1 },
  };
}

function say(state: MelodyState, patch: Partial<MelodyState>, message: string): MelodyState {
  return { ...state, ...patch, message, revision: state.revision + 1 };
}

function sayFromLibrary(state: MelodyState, kind: DialogueKind, patch: Partial<MelodyState> = {}, prefix = ""): MelodyState {
  const cursor = state.lineCursors[kind] ?? 0;
  return say(state, { ...patch, lineCursors: { ...state.lineCursors, [kind]: cursor + 1 } }, prefix + dialogueLine(kind, cursor));
}

function chooseMode(state: MelodyState, mode: MelodyMode): MelodyState {
  const question = mode === "find" || mode === "count" ? melodyQuestion(mode, state.completed, false, state.contentTurn, state.topic, state.lastObjectId) : null;
  const patch: Partial<MelodyState> = {
    mode, question, phase: "playing", selected: null, counted: [], hint: false, returnMode: null,
    familyConnected: false, familyDigits: [], familyStep: 0, echoed: [], sequenceHeard: false,
    sequence: mode === "telephone" ? telephoneSequence(state.telephoneRound, state.telephoneDifficulty, state.sessionSeed) : [],
    contentTurn: state.contentTurn + Number(mode === "count"), lastObjectId: mode === "count" ? question?.object.id : state.lastObjectId,
  };
  if (mode === "explore" || mode === "telephone") return sayFromLibrary(state, mode === "explore" ? "explore" : "telephone", patch);
  return say(state, patch, mode === "family" ? MELODY_LINES.family : question!.prompt);
}

function endCall(state: MelodyState): MelodyState {
  if (state.mode === "family") return sayFromLibrary(state, "goodbye", { phase: "playing", familyConnected: false, familyDigits: [], familyStep: 0 });
  const next = chooseMode(state, state.returnMode ?? "explore");
  return sayFromLibrary(next, "goodbye", {}, next.question ? `${next.question.prompt} ` : "");
}

export function melodyReducer(state: MelodyState, action: MelodyAction): MelodyState {
  switch (action.type) {
    case "start":
      return state.phase === "welcome" ? chooseMode(state, "explore") : state;
    case "mode":
      return chooseMode(state, action.mode);
    case "number": {
      const number = action.number;
      if (!Number.isInteger(number) || number < 0 || number > 9 || ["sleeping", "ringing", "dialing", "listening", "celebrating"].includes(state.phase) || state.familyConnected) return state;
      const discoveries = state.discoveries.includes(number) ? state.discoveries : [...state.discoveries, number];
      if (state.mode === "family") {
        return say(state, { selected: number, discoveries, familyDigits: [...state.familyDigits.slice(-2), number] }, `${NUMBER_NAMES[number]}!`);
      }
      if (state.mode === "telephone") {
        if (!state.sequenceHeard) return sayFromLibrary(state, "telephone");
        if (number !== telephoneAnswer(state.sequence, state.telephoneDifficulty)[state.echoed.length]) return sayFromLibrary(state, "telephoneRetry", { selected: number, discoveries, hint: true, echoed: [], sequenceHeard: false });
        const echoed = [...state.echoed, number];
        const complete = echoed.length === state.sequence.length;
        const patch: Partial<MelodyState> = {
          echoed, discoveries, selected: number, hint: false,
          phase: complete ? "celebrating" : "playing", completed: state.completed + Number(complete),
          telephoneRound: state.telephoneRound + Number(complete),
        };
        return complete ? sayFromLibrary(state, "telephoneSuccess", patch) : say(state, patch, `${NUMBER_NAMES[number]}!`);
      }
      if (state.mode === "explore") {
        const object = discoveryObject(state.contentTurn, state.topic, state.lastObjectId);
        return say(state, { phase: "playing", selected: number, discoveries, exploreObject: object, contentTurn: state.contentTurn + 1, lastObjectId: object.id },
          number === 0 ? "Zero! Zero means none." : `${NUMBER_NAMES[number]}! ${object.fact}`);
      }
      if (!state.question) return state;
      if (number !== state.question.target) {
        return sayFromLibrary(state, "retry", { selected: number, hint: true, discoveries },
          `That's ${NUMBER_NAMES[number]}. ${state.mode === "count" ? `Let's count together. Look for ${NUMBER_NAMES[state.question.target]}.` : `Let's look for ${NUMBER_NAMES[state.question.target]}.`} `);
      }
      return sayFromLibrary(state, "success", { selected: number, discoveries, phase: "celebrating", hint: false, completed: state.completed + 1 }, `Yes! ${NUMBER_NAMES[number]}! `);
    }
    case "count-object": {
      if (state.phase !== "playing" || state.mode !== "count" || !state.question || !Number.isInteger(action.index) || action.index < 0 || action.index >= state.question.target || state.counted.includes(action.index)) return state;
      const counted = [...state.counted, action.index];
      return say(state, { counted }, `${NUMBER_NAMES[counted.length]}!${counted.length === state.question.target ? " Now tap the matching number." : ""}`);
    }
    case "next":
      return state.phase === "celebrating" ? state.returnMode !== null || state.familyConnected ? endCall(state) : chooseMode(state, state.mode) : state;
    case "incoming":
      if (state.returnMode !== null || (action.requested
        ? !["welcome", "playing"].includes(state.phase)
        : state.phase !== "playing" || state.mode !== "explore")) return state;
      return sayFromLibrary(state, "incoming", { phase: "ringing" });
    case "call": {
      if (state.mode === "family") {
        if (state.phase === "ringing" && state.familyContactId) return melodyReducer(state, { type: "connect-family" });
        return state;
      }
      if (state.phase === "sleeping" || state.returnMode !== null) return state;
      const question = melodyQuestion("count", state.completed, true, state.contentTurn, state.topic, state.lastObjectId);
      return say(state, {
        returnMode: state.mode, mode: "count", phase: "playing", question,
        selected: null, counted: [], hint: false, calls: state.calls + 1, contentTurn: state.contentTurn + 1, lastObjectId: question.object.id,
      }, question.prompt);
    }
    case "dismiss":
      return state.phase === "ringing" ? say(state, { phase: "playing" }, state.mode === "family" ? MELODY_LINES.family : state.question?.prompt ?? "Let's keep exploring. Tap any number!") : state;
    case "hang-up":
      return state.returnMode !== null || state.familyConnected || state.phase === "dialing" ? endCall(state) : state;
    case "sleep":
      return sayFromLibrary(state, "rest", { phase: "sleeping" });
    case "wake":
      return chooseMode(state, "explore");
    case "select-contact":
      if (state.mode !== "family" || state.phase !== "playing" || state.familyConnected || !Object.hasOwn(FAMILY_STORIES, action.contact.story)) return state;
      return say(state, { familyContactId: action.contact.id, familyStory: action.contact.story, familyDigits: [], selected: null }, MELODY_LINES.selected);
    case "erase":
      return state.mode === "family" && state.phase === "playing" && !state.familyConnected
        ? say(state, { familyDigits: state.familyDigits.slice(0, -1) }, MELODY_LINES.selected) : state;
    case "dial-family":
      if (state.mode !== "family" || state.phase !== "playing" || state.familyConnected) return state;
      if (!action.contact || action.contact.number.join("") !== state.familyDigits.join("") || !Object.hasOwn(FAMILY_STORIES, action.contact.story)) return say(state, { hint: true }, MELODY_LINES.notFound);
      return say(state, { phase: "dialing", familyContactId: action.contact.id, familyStory: action.contact.story, hint: false }, MELODY_LINES.dialing);
    case "connect-family":
      if (state.mode !== "family" || !["dialing", "ringing"].includes(state.phase)) return state;
      return say(state, { phase: "playing", familyConnected: true, familyStep: 0, calls: state.calls + 1,
        familyAdventure: state.familyVisits[state.familyStory] ?? 0, familyVisits: { ...state.familyVisits, [state.familyStory]: (state.familyVisits[state.familyStory] ?? 0) + 1 },
      }, familyAdventure(state.familyStory, state.familyVisits[state.familyStory] ?? 0).nodes[0].text);
    case "incoming-family":
      if (state.mode !== "family" || state.phase !== "playing" || state.familyConnected || !Object.hasOwn(FAMILY_STORIES, action.contact.story)) return state;
      return say(state, { phase: "ringing", familyContactId: action.contact.id, familyStory: action.contact.story }, MELODY_LINES.familyRinging);
    case "family-choice": {
      if (!state.familyConnected || state.mode !== "family" || state.phase !== "playing") return state;
      const story = familyAdventure(state.familyStory, state.familyAdventure);
      if (!story.nodes[state.familyStep].choices.some(choice => choice.next === action.next)) return state;
      const node = story.nodes[action.next];
      return say(state, { familyStep: action.next, phase: node.choices.length ? "playing" : "celebrating", completed: state.completed + Number(!node.choices.length) }, node.text);
    }
    case "listen":
      return state.mode === "telephone" && state.phase === "playing"
        ? sayFromLibrary(state, "listen", { phase: "listening", echoed: [], hint: false, sequenceHeard: false }) : state;
    case "sequence-ready":
      return state.mode === "telephone" && state.phase === "listening"
        ? sayFromLibrary(state, TELEPHONE_LEVELS[state.telephoneDifficulty].reverse ? "reverse" : "repeat", { phase: "playing", sequenceHeard: true }) : state;
    case "restore":
      return state.phase === "welcome" && state.revision === 0 ? createMelodyState(readMelodyProgress(action.progress, state.telephoneDifficulty)) : state;
    case "topic": {
      if (!["explore", "count"].includes(state.mode) || state.phase !== "playing" || state.returnMode !== null || action.topic !== "all" && !DISCOVERY_TOPICS.some(topic => topic.id === action.topic)) return state;
      const next = { ...state, topic: action.topic };
      if (state.mode === "count") return chooseMode(next, "count");
      return sayFromLibrary(next, "explore", { selected: null, exploreObject: null });
    }
    case "difficulty":
      if (state.mode !== "telephone" || !Object.hasOwn(TELEPHONE_LEVELS, action.difficulty) || !["playing", "celebrating"].includes(state.phase)) return state;
      return chooseMode({ ...state, telephoneDifficulty: action.difficulty, telephoneRound: 0 }, "telephone");
  }
}
