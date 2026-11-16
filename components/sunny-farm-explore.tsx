"use client";
import { useState } from "react";
import type { FarmTaskId } from "@/lib/sunny-farm";
import type { FarmSound } from "@/lib/sunny-farm-feedback";
import styles from "./sunny-farm.module.css";
type Toy = { label: string; symbol: string; x: number; y: number; sound: FarmSound; replies: readonly string[] };
const bell: Toy = { label: "Ring the farm bell", symbol: "🔔", x: 90, y: 16, sound: "bell", replies: ["Ding! Hello, farm friends.", "A little bell rings across the farm.", "Ding, ding! Who is listening?"] };
const butterfly: Toy = { label: "Play with the butterfly", symbol: "🦋", x: 12, y: 25, sound: "collect", replies: ["Flutter, flutter! Follow those bright wings.", "Your butterfly found another flower.", "A little visitor on the farm!"] };
export const SCENE_TOYS: Record<FarmTaskId | "map", readonly Toy[]> = {
  map: [bell, butterfly],
  horse: [bell, { label: "Peek through the stable window", symbol: "🐦", x: 14, y: 22, sound: "click", replies: ["A little bird says hello from the window.", "Fresh air and sunshine for the stable.", "What can you spot outside?"] }],
  cow: [bell, { label: "Listen to the cow", symbol: "🐮", x: 14, y: 24, sound: "cow", replies: ["Mooo! Your cow says hello.", "A friendly moo from the barn.", "Your cow is happy to see you."] }],
  chickens: [{ label: "Wake the rooster", symbol: "🐓", x: 15, y: 16, sound: "rooster", replies: ["Cock-a-doodle-doo! A farm morning call.", "The rooster has something to say!", "Hello, sunshine!"] }, { ...butterfly, label: "Tickle the floating feather", symbol: "🪶", x: 25, y: 40, replies: ["Whoosh! A feather floats past.", "Catch it before it drifts away.", "So light and fluffy!"] }],
  sheep: [{ ...bell, label: "Swing the pasture gate", symbol: "🚪", x: 90, y: 72, replies: ["The gate swings open, then closes gently.", "A safe pasture for our fluffy friends.", "Come on in, little sheep!"] }, butterfly],
  ducks: [{ label: "Say hello to the pond frog", symbol: "🐸", x: 12, y: 80, sound: "frog", replies: ["Ribbit! A frog is hiding by the pond.", "Your frog hops onto a lily pad.", "Ribbit, ribbit! Hello to you too."] }, { label: "Make a pond ripple", symbol: "💧", x: 87, y: 76, sound: "collect", replies: ["Plip! Watch the circles spread.", "A tiny splash in the sunshine.", "Little ripples reach the lily pads."] }],
  hay: [{ ...bell, label: "Toot the tractor horn", symbol: "📯", x: 12, y: 16, replies: ["Toot, toot! Here comes the tractor.", "Make way for our little farmer!", "A friendly toot across the field."] }, butterfly],
  orchard: [butterfly, { label: "Find the orchard bird", symbol: "🐦", x: 87, y: 24, sound: "click", replies: ["A bird peeks out between the leaves.", "Look up! A little orchard visitor.", "Your bird flutters to another branch."] }],
  garden: [{ ...butterfly, label: "Meet the garden bee", symbol: "🐝", x: 10, y: 25, replies: ["A busy bee visits the flowers.", "Buzz! Another little garden helper.", "Your bee is looking for blossoms."] }, { ...bell, label: "Wave to the scarecrow", symbol: "🧑‍🌾", x: 90, y: 24, replies: ["The scarecrow waves a straw hello.", "Our garden has a cheerful lookout.", "Hello there, garden helper!"] }],
};
export function FarmExplore({ scene, onExplore }: { scene: FarmTaskId | "map"; onExplore: (text: string, sound: FarmSound) => void }) {
  const [visits, setVisits] = useState<Record<string, number>>({});
  return <div className={styles.exploreLayer} aria-label="Explore this scene">{SCENE_TOYS[scene].map(toy => <button type="button" key={toy.label} className={styles.sceneToy} style={{ left: `${toy.x}%`, top: `${toy.y}%` }} aria-label={toy.label} title={toy.label} onPointerDown={e => e.stopPropagation()} onPointerUp={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); const count = visits[toy.label] ?? 0; setVisits({ ...visits, [toy.label]: count + 1 }); onExplore(toy.replies[count % toy.replies.length], toy.sound); }}><span key={visits[toy.label] ?? 0} className={visits[toy.label] ? styles.toyPlaying : ""} aria-hidden="true">{toy.symbol}</span><small aria-hidden="true">✦</small></button>)}</div>;
}
