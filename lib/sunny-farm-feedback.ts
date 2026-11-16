import type { FarmTaskId } from "./sunny-farm";
export type FarmFeedbackKind = "feed" | "egg" | "fruit" | "milk" | "grow" | "care" | "complete" | "celebrate";
export const FARM_RESPONSES: Record<FarmFeedbackKind, readonly string[]> = {
  feed: ["That was tasty! Thank you!", "A little meal and a happy friend.", "Munch, munch. All fed!", "You made a hungry friend smile."],
  egg: ["One more egg, tucked in safely.", "A fresh egg for our breakfast!", "Into the basket it goes.", "Careful hands. Lovely collecting!"],
  fruit: ["A rosy apple for breakfast!", "Picked and packed with care.", "A sweet little orchard treasure."],
  milk: ["Fresh milk for the breakfast basket!", "A full pail. Thank you, cow!", "You and your cow make a lovely team."],
  grow: ["Look at your garden grow!", "A little care goes a long way.", "Growing something good together."],
  care: ["Your gentle hands make a difference.", "That feels lovely!", "Another little bit of farm magic.", "Nice helping, little farmer!"],
  complete: ["All cared for. What a happy friend!", "Beautiful work! Where shall we go next?", "A happy stop on our farm adventure.", "You did it! Time to explore."],
  celebrate: ["What a lovely day on the farm!", "Everyone is cared for. Hooray!", "A farm full of happy friends!"],
};
export function feedbackKind(task: FarmTaskId, target: string): FarmFeedbackKind {
  if (target === "feed" || target.startsWith("duck")) return "feed";
  if (target.startsWith("egg")) return "egg";
  if (target.startsWith("apple")) return "fruit";
  if (target === "milk-finish") return "milk";
  return task === "garden" ? "grow" : "care";
}
export function responseAt(kind: FarmFeedbackKind, index: number) {
  const choices = FARM_RESPONSES[kind];
  return choices[((index % choices.length) + choices.length) % choices.length];
}
export const FARM_AUDIO = {
  cow: "cow.mp3", horse: "horse.mp3", sheep: "sheep.mp3", chickens: "chicken.mp3", ducks: "duck.mp3", frog: "frog.mp3", rooster: "rooster.mp3",
  click: "click.wav", collect: "collect.wav", bell: "bell.wav", success: "success.wav",
} as const;
export type FarmSound = keyof typeof FARM_AUDIO;
