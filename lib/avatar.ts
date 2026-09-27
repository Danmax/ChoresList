export const SKIN_TONES = ["#F8D6B3", "#F0BF8B", "#D99A62", "#B96F3E", "#8A4F2C", "#63351F"] as const;
export const HAIR_COLORS = ["#201713", "#4A2A1A", "#754326", "#B66A2C", "#E0B15B", "#A83A2A", "#8B8A91", "#6D3FC0"] as const;
export const EYE_COLORS = ["#3B2418", "#704329", "#A36B35", "#55805B", "#3E78A8", "#69717A"] as const;
export const SHIRT_COLORS = ["#7C3AED", "#2563EB", "#0891B2", "#059669", "#65A30D", "#EAB308", "#EA580C", "#E11D48", "#DB2777", "#475569"] as const;
export const BACKGROUND_COLORS = ["#CFFAFE", "#DBEAFE", "#EDE9FE", "#FCE7F3", "#FFE4E6", "#FEF3C7", "#DCFCE7", "#F1F5F9"] as const;

export const HAIR_STYLES = [
  { value: "short", label: "Short" }, { value: "swoop", label: "Swoop" },
  { value: "curly", label: "Curly" }, { value: "coily", label: "Coily" },
  { value: "long", label: "Long" }, { value: "bob", label: "Bob" },
  { value: "ponytail", label: "Ponytail" }, { value: "bun", label: "Bun" },
  { value: "braids", label: "Braids" }, { value: "locs", label: "Locs" },
  { value: "fade", label: "Fade" }, { value: "bald", label: "Bald" },
] as const;
export const EYE_STYLES = [
  { value: "bright", label: "Bright" }, { value: "round", label: "Round" },
  { value: "happy", label: "Happy" }, { value: "gentle", label: "Gentle" },
] as const;
export const MOUTH_STYLES = [
  { value: "big-smile", label: "Big Smile" }, { value: "smile", label: "Smile" },
  { value: "grin", label: "Grin" }, { value: "calm", label: "Calm" },
] as const;
export const NOSE_STYLES = [
  { value: "button", label: "Button" }, { value: "round", label: "Round" },
  { value: "soft", label: "Soft" }, { value: "small", label: "Small" },
] as const;
export const ACCESSORIES = [
  { value: "none", label: "None" }, { value: "glasses", label: "Glasses" },
  { value: "round-glasses", label: "Round Glasses" }, { value: "sunglasses", label: "Sunglasses" },
  { value: "headband", label: "Headband" }, { value: "bow", label: "Bow" },
  { value: "cap", label: "Cap" }, { value: "earrings", label: "Earrings" },
  { value: "hearing-aid", label: "Hearing Aid" }, { value: "freckles", label: "Freckles" },
] as const;

export type AvatarConfig = {
  version: 1;
  skinTone: string;
  hairStyle: typeof HAIR_STYLES[number]["value"];
  hairColor: string;
  eyeStyle: typeof EYE_STYLES[number]["value"];
  eyeColor: string;
  mouthStyle: typeof MOUTH_STYLES[number]["value"];
  noseStyle: typeof NOSE_STYLES[number]["value"];
  accessory: typeof ACCESSORIES[number]["value"];
  shirtColor: string;
  backgroundColor: string;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  version: 1,
  skinTone: SKIN_TONES[1],
  hairStyle: "swoop",
  hairColor: HAIR_COLORS[1],
  eyeStyle: "bright",
  eyeColor: EYE_COLORS[0],
  mouthStyle: "big-smile",
  noseStyle: "button",
  accessory: "none",
  shirtColor: SHIRT_COLORS[1],
  backgroundColor: BACKGROUND_COLORS[0],
};

const values = <T extends readonly { value: string }[]>(items: T) => new Set(items.map((item) => item.value));
const hairStyles = values(HAIR_STYLES);
const eyeStyles = values(EYE_STYLES);
const mouthStyles = values(MOUTH_STYLES);
const noseStyles = values(NOSE_STYLES);
const accessories = values(ACCESSORIES);

function allowedColor(value: unknown, allowed: readonly string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value) ? value : fallback;
}

export function cleanAvatarConfig(value: unknown): AvatarConfig | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const pick = (candidate: unknown, allowed: Set<string>, fallback: string) => typeof candidate === "string" && allowed.has(candidate) ? candidate : fallback;
  return {
    version: 1,
    skinTone: allowedColor(input.skinTone, SKIN_TONES, DEFAULT_AVATAR_CONFIG.skinTone),
    hairStyle: pick(input.hairStyle, hairStyles, DEFAULT_AVATAR_CONFIG.hairStyle) as AvatarConfig["hairStyle"],
    hairColor: allowedColor(input.hairColor, HAIR_COLORS, DEFAULT_AVATAR_CONFIG.hairColor),
    eyeStyle: pick(input.eyeStyle, eyeStyles, DEFAULT_AVATAR_CONFIG.eyeStyle) as AvatarConfig["eyeStyle"],
    eyeColor: allowedColor(input.eyeColor, EYE_COLORS, DEFAULT_AVATAR_CONFIG.eyeColor),
    mouthStyle: pick(input.mouthStyle, mouthStyles, DEFAULT_AVATAR_CONFIG.mouthStyle) as AvatarConfig["mouthStyle"],
    noseStyle: pick(input.noseStyle, noseStyles, DEFAULT_AVATAR_CONFIG.noseStyle) as AvatarConfig["noseStyle"],
    accessory: pick(input.accessory, accessories, DEFAULT_AVATAR_CONFIG.accessory) as AvatarConfig["accessory"],
    shirtColor: allowedColor(input.shirtColor, SHIRT_COLORS, DEFAULT_AVATAR_CONFIG.shirtColor),
    backgroundColor: allowedColor(input.backgroundColor, BACKGROUND_COLORS, DEFAULT_AVATAR_CONFIG.backgroundColor),
  };
}

export function randomAvatarConfig(): AvatarConfig {
  const one = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
  return {
    version: 1, skinTone: one(SKIN_TONES), hairStyle: one(HAIR_STYLES).value,
    hairColor: one(HAIR_COLORS), eyeStyle: one(EYE_STYLES).value, eyeColor: one(EYE_COLORS),
    mouthStyle: one(MOUTH_STYLES).value, noseStyle: one(NOSE_STYLES).value,
    accessory: one(ACCESSORIES).value, shirtColor: one(SHIRT_COLORS), backgroundColor: one(BACKGROUND_COLORS),
  };
}
