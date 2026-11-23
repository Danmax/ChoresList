export type MelodyMode = "explore" | "find" | "count";
export type MelodyPhase = "welcome" | "playing" | "ringing" | "celebrating" | "sleeping";
export const NUMBER_NAMES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

const OBJECTS = [
  { emoji: "⭐", singular: "star", plural: "stars" },
  { emoji: "🍎", singular: "apple", plural: "apples" },
  { emoji: "🎈", singular: "balloon", plural: "balloons" },
] as const;

export type MelodyQuestion = {
  kind: "find" | "count";
  target: number;
  object: (typeof OBJECTS)[number];
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
};

export type MelodyAction =
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

export function melodyQuestion(mode: "find" | "count", completed: number, call = false): MelodyQuestion {
  // Every child starts with 1–3, then 1–5. Later questions include every digit,
  // including zero, while the complete keypad always remains available.
  const sequence = completed < 6 ? [2, 3, 1, 3, 2, 1] : completed < 12 ? [4, 2, 5, 3, 1, 5] : [0, 6, 7, 8, 9, 3, 5, 2, 4, 1];
  const offset = completed < 6 ? completed : completed < 12 ? completed - 6 : completed - 12;
  const target = sequence[offset % sequence.length];
  const object = OBJECTS[completed % OBJECTS.length];
  const prompt = mode === "find"
    ? `Can you find number ${NUMBER_NAMES[target]}?`
    : target === 0
      ? `There are no ${object.plural}! Which number means none?`
      : `How many ${object.plural} can you see? Tap each one to count, then press the number.`;
  const introduction = call ? ["Hello! I'm looking at the night sky.", "Hello! I'm packing a little picnic.", "Hello! I'm having a balloon party."][completed % 3] + " " : "";
  return { kind: mode, target, object, prompt: introduction + prompt };
}

export function createMelodyState(): MelodyState {
  return {
    mode: "explore", phase: "welcome", question: null, selected: null,
    counted: [], completed: 0, discoveries: [], hint: false,
    message: "Hello, I'm Melody! Let's play with numbers.", revision: 0,
    returnMode: null, calls: 0,
  };
}

function say(state: MelodyState, patch: Partial<MelodyState>, message: string): MelodyState {
  return { ...state, ...patch, message, revision: state.revision + 1 };
}

function chooseMode(state: MelodyState, mode: MelodyMode): MelodyState {
  const question = mode === "explore" ? null : melodyQuestion(mode, state.completed);
  return say(state, { mode, question, phase: "playing", selected: null, counted: [], hint: false, returnMode: null },
    question?.prompt ?? "Tap any number! Let's see what we discover.");
}

function endCall(state: MelodyState): MelodyState {
  const next = chooseMode(state, state.returnMode ?? "explore");
  return { ...next, message: "Thanks for playing with me! Goodbye for now." };
}

export function melodyReducer(state: MelodyState, action: MelodyAction): MelodyState {
  switch (action.type) {
    case "start":
      return state.phase === "welcome" ? chooseMode(state, "explore") : state;
    case "mode":
      return chooseMode(state, action.mode);
    case "number": {
      const number = action.number;
      if (!Number.isInteger(number) || number < 0 || number > 9 || ["sleeping", "ringing", "celebrating"].includes(state.phase)) return state;
      const discoveries = state.discoveries.includes(number) ? state.discoveries : [...state.discoveries, number];
      if (state.mode === "explore") {
        return say(state, { phase: "playing", selected: number, discoveries },
          number === 0 ? "Zero! Zero means none." : `${NUMBER_NAMES[number]}! ${number} ${number === 1 ? "star" : "stars"}.`);
      }
      if (!state.question) return state;
      if (number !== state.question.target) {
        return say(state, { selected: number, hint: true, discoveries },
          `That's ${NUMBER_NAMES[number]}. ${state.mode === "count" ? `Let's count together. Look for ${NUMBER_NAMES[state.question.target]}.` : `Let's look for ${NUMBER_NAMES[state.question.target]}.`}`);
      }
      return say(state, { selected: number, discoveries, phase: "celebrating", hint: false, completed: state.completed + 1 },
        `Yes! ${NUMBER_NAMES[number]}! ${["You found it!", "We did it together!", "What a lovely discovery!"][state.completed % 3]}`);
    }
    case "count-object": {
      if (state.phase !== "playing" || state.mode !== "count" || !state.question || !Number.isInteger(action.index) || action.index < 0 || action.index >= state.question.target || state.counted.includes(action.index)) return state;
      const counted = [...state.counted, action.index];
      return say(state, { counted }, `${NUMBER_NAMES[counted.length]}!${counted.length === state.question.target ? " Now tap the matching number." : ""}`);
    }
    case "next":
      return state.phase === "celebrating" ? state.returnMode !== null ? endCall(state) : chooseMode(state, state.mode) : state;
    case "incoming":
      if (state.returnMode !== null || (action.requested
        ? !["welcome", "playing"].includes(state.phase)
        : state.phase !== "playing" || state.mode !== "explore")) return state;
      return say(state, { phase: "ringing" }, "Ring, ring! It's Melody. Would you like to play?");
    case "call": {
      if (state.phase === "sleeping" || state.returnMode !== null) return state;
      const question = melodyQuestion("count", state.completed, true);
      return say(state, {
        returnMode: state.mode, mode: "count", phase: "playing", question,
        selected: null, counted: [], hint: false, calls: state.calls + 1,
      }, question.prompt);
    }
    case "dismiss":
      return state.phase === "ringing" ? say(state, { phase: "playing" }, state.question?.prompt ?? "Let's keep exploring. Tap any number!") : state;
    case "hang-up":
      return state.returnMode !== null ? endCall(state) : state;
    case "sleep":
      return say(state, { phase: "sleeping" }, "Thank you for playing with me. See you next time, little explorer!");
    case "wake":
      return chooseMode(state, "explore");
  }
}
